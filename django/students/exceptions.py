import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        logger.error("Unexpected API error", exc_info=(type(exc), exc, exc.__traceback__))
        return Response(
            {"errors": {"detail": "Внутренняя ошибка сервера."}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    response.data = {"errors": response.data}
    return response
