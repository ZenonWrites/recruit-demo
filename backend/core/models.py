from django.contrib.auth.models import User
from django.db import models


class Profile(models.Model):
    ROLES = [("candidate", "Candidate"), ("company", "Company")]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=10, choices=ROLES)
    name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=80, blank=True)
    # candidate fields
    skills = models.CharField(max_length=300, blank=True)
    experience_years = models.IntegerField(default=0)
    nationality = models.CharField(max_length=60, blank=True)
    iqama_status = models.CharField(max_length=40, blank=True)
    languages = models.CharField(max_length=120, blank=True)
    expected_salary = models.IntegerField(default=0)
    # company fields
    company_name = models.CharField(max_length=120, blank=True)
    cr_number = models.CharField(max_length=30, blank=True)
    verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.role}: {self.company_name or self.name or self.phone}"


class Job(models.Model):
    company = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="jobs")
    title = models.CharField(max_length=120)
    skills = models.CharField(max_length=300, blank=True)
    workers_needed = models.IntegerField(default=1)
    skill_level = models.CharField(max_length=20, default="Skilled")
    min_experience = models.IntegerField(default=0)
    salary_min = models.IntegerField(default=0)
    salary_max = models.IntegerField(default=0)
    contract_type = models.CharField(max_length=20, default="Monthly")
    location = models.CharField(max_length=80, blank=True)
    duty_hours = models.IntegerField(default=8)
    auto_reject = models.BooleanField(default=False)
    is_open = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Application(models.Model):
    STATUS = [
        ("applied", "Applied"), ("under_review", "Under review"), ("shortlisted", "Shortlisted"),
        ("interview_scheduled", "Interview scheduled"), ("selected", "Selected"), ("rejected", "Rejected"),
    ]
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    candidate = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="applications")
    status = models.CharField(max_length=20, choices=STATUS, default="applied")
    match_score = models.IntegerField(default=0)
    interview_at = models.DateTimeField(null=True, blank=True)
    interview_mode = models.CharField(max_length=20, blank=True)
    offer_status = models.CharField(max_length=10, default="none")  # none / sent / accepted / declined
    offer_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("job", "candidate")
        ordering = ["-created_at"]


def _split(text):
    return {s.strip().lower() for s in (text or "").split(",") if s.strip()}


def match_score(p, j):
    """0-100 score: skills 50%, experience 25%, salary fit 15%, location 10%."""
    req, have = _split(j.skills), _split(p.skills)
    skill = len(req & have) / len(req) if req else 0.5
    exp = min(p.experience_years / j.min_experience, 1) if j.min_experience else 1
    if not p.expected_salary or p.expected_salary <= j.salary_max:
        sal = 1
    else:
        sal = j.salary_max / p.expected_salary
    same_city = p.location and j.location and p.location.strip().lower() == j.location.strip().lower()
    loc = 1 if same_city else 0.4
    return round(100 * (0.5 * skill + 0.25 * exp + 0.15 * sal + 0.10 * loc))
