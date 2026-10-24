from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination matching frontend Paginated<T> interface:
    { count: number, next: string | null, previous: string | null, results: T[] }
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200
