from django.db import models
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator


class Student(models.Model):
    fullName = models.CharField(
        max_length=120,
        validators=[
            RegexValidator(
                regex=r"^[A-Za-zА-Яа-яЁё -]{2,120}$",
                message="Полное имя должно содержать только буквы, пробелы и дефисы",
            )
        ],
    )

    group = models.CharField(
        max_length=5,
        validators=[
            RegexValidator(
                regex=r"^[A-Z][1-4][1-5]\d{2}$",
                message="Группа состоит из латинской буквы и четырёх правильных цифр",
            )
        ],
    )

    isuId = models.CharField(
        max_length=6,
        validators=[
            RegexValidator(
                regex=r"^[1-9]\d{5}$",
                message="ИСУ ID должен быть шестизначным числом",
            )
        ],
    )

    dormitory = models.IntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(20),
        ]
    )

    room = models.IntegerField(
        validators=[
            MinValueValidator(100),
            MaxValueValidator(599),
        ]
    )

    settlementDate = models.DateField()

    isForeign = models.BooleanField(default=False)

    notes = models.CharField(
        max_length=500,
        blank=True,
        default="",
    )

    class Meta:
        managed = False

    def __str__(self):
        return f"{self.fullName} {self.isuId}"
