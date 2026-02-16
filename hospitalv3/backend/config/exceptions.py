from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response
    detail = response.data
    if isinstance(detail, dict) and "detail" in detail:
        response.data = {"error": detail["detail"]}
    elif isinstance(detail, list):
        response.data = {"error": detail}
    elif isinstance(detail, dict):
        response.data = {"error": detail}
    else:
        response.data = {"error": str(detail)}
    return response
