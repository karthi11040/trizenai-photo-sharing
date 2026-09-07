from django.http import HttpResponse

def event_list(request):
    return HttpResponse("Event list placeholder")

def assigned_events(request):
    return HttpResponse("Assigned events placeholder")
