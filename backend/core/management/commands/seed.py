from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from core.models import Application, Job, Profile, match_score


def make(phone, **kw):
    user, _ = User.objects.get_or_create(username=phone)
    p, _ = Profile.objects.update_or_create(user=user, defaults=dict(phone=phone, **kw))
    return p


class Command(BaseCommand):
    help = "Load demo companies, candidates, jobs and applications"

    def handle(self, *args, **options):
        Job.objects.all().delete()
        c1 = make("0500000001", role="company", name="Al-Noor Manpower", company_name="Al-Noor Manpower",
                  cr_number="1010123456", verified=True, location="Riyadh")
        c2 = make("0500000002", role="company", name="Gulf Skilled Workforce", company_name="Gulf Skilled Workforce",
                  cr_number="4030987654", verified=True, location="Jeddah")
        make("0500000003", role="candidate", name="Rahim Khan", skills="electrician, wiring, maintenance",
             experience_years=4, nationality="Pakistani", location="Riyadh", expected_salary=2500,
             iqama_status="Valid", languages="Urdu, Hindi, English")
        cands = [
            make("0500000004", role="candidate", name="Sunil Kumar", skills="plumber, pipe fitting",
                 experience_years=6, nationality="Indian", location="Riyadh", expected_salary=2800,
                 iqama_status="Valid", languages="Hindi, English"),
            make("0500000005", role="candidate", name="Md. Hasan", skills="electrician, wiring",
                 experience_years=1, nationality="Bangladeshi", location="Dammam", expected_salary=2200,
                 iqama_status="Transferable", languages="Bengali"),
            make("0500000006", role="candidate", name="Jose Santos", skills="carpenter, furniture, painter",
                 experience_years=8, nationality="Filipino", location="Jeddah", expected_salary=3500,
                 iqama_status="Valid", languages="Filipino, English"),
        ]
        jobs = [
            Job.objects.create(company=c1, title="Electrician", skills="electrician, wiring", workers_needed=10,
                               skill_level="Skilled", min_experience=2, salary_min=2200, salary_max=3000,
                               contract_type="Monthly", location="Riyadh", duty_hours=8, auto_reject=True),
            Job.objects.create(company=c1, title="Plumber", skills="plumber, pipe fitting", workers_needed=5,
                               skill_level="Skilled", min_experience=3, salary_min=2300, salary_max=3200,
                               contract_type="Project-based", location="Riyadh", duty_hours=10),
            Job.objects.create(company=c2, title="Carpenter", skills="carpenter, furniture", workers_needed=8,
                               skill_level="Expert", min_experience=5, salary_min=3000, salary_max=4000,
                               contract_type="Monthly", location="Jeddah", duty_hours=8),
            Job.objects.create(company=c2, title="AC Technician", skills="ac technician, hvac", workers_needed=6,
                               skill_level="Skilled", min_experience=2, salary_min=2500, salary_max=3300,
                               contract_type="Daily", location="Jeddah", duty_hours=9),
        ]
        plan = [(cands[0], jobs[1], "under_review"), (cands[1], jobs[0], "rejected"),
                (cands[2], jobs[2], "shortlisted")]
        for cand, job, status in plan:
            Application.objects.create(job=job, candidate=cand, status=status, match_score=match_score(cand, job))
        self.stdout.write(self.style.SUCCESS("Demo data loaded."))
        self.stdout.write("Company login:   0500000001 (OTP 123456)")
        self.stdout.write("Candidate login:  0500000003 (OTP 123456)")
