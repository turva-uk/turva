"""Form for creating a safety file."""

from __future__ import annotations

from django import forms
from django.utils.translation import gettext_lazy as _

from app.safetyfiles.models import STANDARD_CHOICES


class SafetyFileForm(forms.Form):
    """The four questions asked when creating a safety file.

    Deliberately short. Phase one's workflow is to create a shell, then use
    AI-assisted discovery, then hand it to the customer to fill the gaps - so a
    long form at this point would ask for answers the CSO may not have yet and
    would be the wrong place to collect them. Everything not asked here is
    written into the documents as "to be completed" and is visibly outstanding.
    """

    name = forms.CharField(
        label=_("System name"),
        max_length=200,
        help_text=_(
            "The system being assessed, as people in the organisation call it. "
            "For example: BP@Home remote blood pressure monitoring."
        ),
        widget=forms.TextInput(attrs={"autofocus": True, "autocomplete": "off"}),
    )

    standard = forms.ChoiceField(
        label=_("Standard"),
        choices=STANDARD_CHOICES,
        initial="DCB0160",
        help_text=_(
            "DCB0160 if you are deploying someone else's system. DCB0129 if your "
            "organisation manufactures it."
        ),
    )

    organisation = forms.CharField(
        label=_("Organisation"),
        max_length=200,
        help_text=_("The organisation accountable for this deployment or product."),
        widget=forms.TextInput(attrs={"autocomplete": "organization"}),
    )

    intended_use = forms.CharField(
        label=_("Intended use"),
        widget=forms.Textarea(attrs={"rows": 5}),
        help_text=_(
            "What the system is for, who uses it, and in what setting. This is "
            "the foundation of the whole safety case: a hazard only means "
            "anything relative to what the system is supposed to do."
        ),
    )

    def clean_name(self) -> str:
        name = self.cleaned_data["name"].strip()
        if not name:
            raise forms.ValidationError(_("Give the system a name."))
        return name
