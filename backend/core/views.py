from django.contrib.auth.models import User
from django.utils.dateparse import parse_datetime
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Application, Job, Profile, match_score

DEMO_OTP = "123456"
PROFILE_FIELDS = ["id", "role", "name", "phone", "location", "skills", "experience_years", "nationality",
                  "iqama_status", "languages", "expected_salary", "company_name", "cr_number", "verified"]
EDITABLE = ["name", "location", "skills", "experience_years", "nationality", "iqama_status",
            "languages", "expected_salary", "company_name", "cr_number"]
INT_FIELDS = {"experience_years", "expected_salary"}


def err(msg, code=400):
    return Response({"error": msg}, status=code)


def num(v, default=0):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


def profile_dict(p):
    return {f: getattr(p, f) for f in PROFILE_FIELDS}


def job_dict(j, viewer=None):
    d = {f: getattr(j, f) for f in ["id", "title", "skills", "workers_needed", "skill_level", "min_experience",
                                    "salary_min", "salary_max", "contract_type", "location", "duty_hours",
                                    "auto_reject", "is_open"]}
    d["company"] = j.company.company_name or j.company.name
    d["verified"] = j.company.verified
    d["applicant_count"] = j.applications.count()
    if viewer and viewer.role == "candidate":
        d["match_score"] = match_score(viewer, j)
        d["applied"] = j.applications.filter(candidate=viewer).exists()
    return d


def app_dict(a):
    return {
        "id": a.id, "status": a.status, "match_score": a.match_score,
        "interview_at": a.interview_at.isoformat() if a.interview_at else None,
        "interview_mode": a.interview_mode, "offer_status": a.offer_status, "offer_text": a.offer_text,
        "created_at": a.created_at.isoformat(),
        "job": {"id": a.job.id, "title": a.job.title, "location": a.job.location,
                "company": a.job.company.company_name or a.job.company.name},
        "candidate": profile_dict(a.candidate),
    }


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    d = request.data
    phone = (d.get("phone") or "").strip()
    if len(phone) < 8:
        return err("Enter a valid mobile number")
    if str(d.get("otp")) != DEMO_OTP:
        return err("Invalid OTP (demo OTP is 123456)")
    user = User.objects.filter(username=phone).first()
    if not user:
        role = d.get("role")
        if role not in ("candidate", "company"):
            return err("Choose a role")
        name = (d.get("name") or "").strip()
        user = User.objects.create_user(username=phone)
        Profile.objects.create(user=user, role=role, name=name, phone=phone,
                               company_name=name if role == "company" else "")
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "profile": profile_dict(user.profile)})


@api_view(["GET", "PUT"])
def me(request):
    p = request.user.profile
    if request.method == "PUT":
        for f in EDITABLE:
            if f in request.data:
                v = request.data[f]
                setattr(p, f, num(v) if f in INT_FIELDS else str(v))
        p.save()
    return Response(profile_dict(p))


@api_view(["GET"])
def stats(request):
    p = request.user.profile
    qs = Application.objects.filter(job__company=p)
    return Response({
        "jobs": Job.objects.filter(company=p).count(),
        "applicants": qs.count(),
        "shortlisted": qs.filter(status__in=["shortlisted", "interview_scheduled"]).count(),
        "hired": qs.filter(status="selected", offer_status="accepted").count(),
    })


@api_view(["GET", "POST"])
def jobs(request):
    p = request.user.profile
    if request.method == "POST":
        if p.role != "company":
            return err("Only companies can post jobs", 403)
        d = request.data
        title = (d.get("title") or "").strip()
        if not title:
            return err("Job title is required")
        Job.objects.create(
            company=p, title=title, skills=d.get("skills", ""), workers_needed=num(d.get("workers_needed"), 1),
            skill_level=d.get("skill_level", "Skilled"), min_experience=num(d.get("min_experience")),
            salary_min=num(d.get("salary_min")), salary_max=num(d.get("salary_max")),
            contract_type=d.get("contract_type", "Monthly"), location=d.get("location", ""),
            duty_hours=num(d.get("duty_hours"), 8), auto_reject=bool(d.get("auto_reject")),
        )
    qs = Job.objects.filter(company=p) if p.role == "company" else Job.objects.filter(is_open=True)
    data = [job_dict(j, p) for j in qs]
    if p.role == "candidate":
        data.sort(key=lambda x: -x["match_score"])
    return Response(data)


@api_view(["POST"])
def apply(request, job_id):
    p = request.user.profile
    if p.role != "candidate":
        return err("Only candidates can apply", 403)
    j = Job.objects.filter(pk=job_id, is_open=True).first()
    if not j:
        return err("Job not found", 404)
    if Application.objects.filter(job=j, candidate=p).exists():
        return err("You already applied to this job")
    status = "applied"
    if j.auto_reject and p.experience_years < j.min_experience:
        status = "rejected"  # auto-screening rule set by the company
    a = Application.objects.create(job=j, candidate=p, status=status, match_score=match_score(p, j))
    return Response(app_dict(a), status=201)


@api_view(["GET"])
def applications(request):
    p = request.user.profile
    if p.role == "candidate":
        qs = Application.objects.filter(candidate=p)
    else:
        qs = Application.objects.filter(job__company=p)
        if request.query_params.get("job"):
            qs = qs.filter(job_id=num(request.query_params["job"]))
    return Response([app_dict(a) for a in qs.order_by("-match_score", "-created_at")])


@api_view(["PATCH"])
def update_application(request, app_id):
    p = request.user.profile
    a = Application.objects.filter(pk=app_id, job__company=p).first() if p.role == "company" else None
    if not a:
        return err("Application not found", 404)
    d = request.data
    st = d.get("status")
    if st:
        if st not in dict(Application.STATUS):
            return err("Invalid status")
        if st == "interview_scheduled":
            dt = parse_datetime(d.get("interview_at") or "")
            if not dt:
                return err("Pick an interview slot")
            a.interview_at = dt
            a.interview_mode = d.get("interview_mode", "online")
        if st == "selected":
            j = a.job
            a.offer_status = "sent"
            a.offer_text = (f"Offer: {j.title} at {j.company.company_name or j.company.name}. "
                            f"Salary SAR {j.salary_max}/month, {j.contract_type} contract, "
                            f"{j.duty_hours} duty hours/day. Joining within 14 days.")
        a.status = st
    a.save()
    return Response(app_dict(a))


@api_view(["POST"])
def offer_response(request, app_id):
    a = Application.objects.filter(pk=app_id, candidate=request.user.profile).first()
    if not a or a.offer_status != "sent":
        return err("No pending offer", 404)
    a.offer_status = "accepted" if request.data.get("accept") else "declined"
    a.save()
    return Response(app_dict(a))
