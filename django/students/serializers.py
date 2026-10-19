from rest_framework import serializers
from .models import Student
from datetime import date, timedelta
from django.utils import timezone


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = [
            "fullName",
            "group",
            "isuId",
            "dormitory",
            "room",
            "settlementDate",
            "isForeign",
            "notes"
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if self.context.get("is_update", False):
            self.fields["isuId"].read_only = True

    def validate(self, attrs):
        if self.context.get("is_update", False) and "isuId" in self.initial_data:
            raise serializers.ValidationError({
                "isuId": "Нельзя изменить ИСУ ID студента."
            })

        return attrs

    def validate_settlementDate(self, value):
        min_date = date(2010, 1, 1)

        if value < min_date:
            raise serializers.ValidationError("Дата заселения не может быть раньше 2010 года.")

        today = timezone.localdate()

        next_month = today.month % 12 + 1
        next_month_year = today.year + (1 if today.month == 12 else 0)

        max_date = date(next_month_year, next_month, 1) + timedelta(days=today.day - 1)

        if value > max_date:
            raise serializers.ValidationError(f"Дата заселения не может быть позже {max_date.isoformat()}.")

        return value

    def validate_fullName(self, value):
        value = " ".join(value.split())

        if len(value) < 2 or len(value) > 120:
            raise serializers.ValidationError(
                "ФИО должно содержать от 2 до 120 символов."
            )

        return value

    def validate_notes(self, value):
        return value.strip()


class StudentFilterSerializer(serializers.Serializer):
    fullName = serializers.RegexField(
        regex=r"^[A-Za-zА-Яа-яЁё -]{2,120}$",
        required=False,
        max_length=120,
    )

    group = serializers.RegexField(
        regex=r"^[A-Z][1-4][1-5]\d{2}$",
        required=False,
    )

    isuId = serializers.RegexField(
        regex=r"^[1-9]\d{5}$",
        required=False,
        max_length=6,
    )

    dormitory = serializers.IntegerField(
        min_value=1,
        max_value=20,
        required=False,
    )

    room = serializers.IntegerField(
        required=False,
        min_value=100,
        max_value=599,
    )

    settlementDate = serializers.DateField(required=False)

    isForeign = serializers.BooleanField(required=False)
    dateFrom = serializers.DateField(required=False)
    dateTo = serializers.DateField(required=False)
    search = serializers.CharField(required=False, allow_blank=True, max_length=120)

    def validate(self, attrs):
        if attrs.get("dateFrom") and attrs.get("dateTo") and attrs["dateFrom"] > attrs["dateTo"]:
            raise serializers.ValidationError({"dateTo": "Конец периода раньше начала."})
        return attrs
