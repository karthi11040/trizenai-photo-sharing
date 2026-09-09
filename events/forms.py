from django import forms
from django.contrib.auth.models import User
from events.models import Event
from accounts.models import Role


class EventForm(forms.ModelForm):
    class Meta:
        model = Event
        fields = ['name', 'event_date', 'location', 'description', 'cover_image']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'e.g., Priya & Arjun Wedding',
                'style': 'border-radius: 10px; min-height: 44px;'
            }),
            'event_date': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date',
                'style': 'border-radius: 10px; min-height: 44px;'
            }),
            'location': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'e.g., Grand Palace Hotel, Mumbai',
                'style': 'border-radius: 10px; min-height: 44px;'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Optional details, schedules, notes for photography team...',
                'style': 'border-radius: 10px;'
            }),
            'cover_image': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*',
                'id': 'eventCoverInput',
                'style': 'border-radius: 10px;'
            }),
        }


class AddMemberForm(forms.Form):
    user = forms.ModelChoiceField(
        queryset=User.objects.none(),
        label="Select Team Member",
        widget=forms.Select(attrs={'class': 'form-select'})
    )

    def __init__(self, *args, event=None, **kwargs):
        super().__init__(*args, **kwargs)
        if event:
            # Only list users who have TEAM_MEMBER role and are not already assigned to this event
            assigned_user_ids = event.memberships.values_list('user_id', flat=True)
            self.fields['user'].queryset = User.objects.filter(
                profile__role=Role.TEAM_MEMBER
            ).exclude(id__in=assigned_user_ids).order_by('username')
