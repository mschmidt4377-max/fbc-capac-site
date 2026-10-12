# Contact form

Visitors send the church a message from `/contact/`. The form posts to Formspree and requires first name, last name, email, subject and message.

## Sub-features

- `contact-fields` shows First Name, Last Name, Email, Subject, Message, and the "Inquiring About" checkboxes (Services, Prayer Request, Other).
- `contact-validation` blocks submission while a required field is empty or the email is malformed.
- `contact-action` posts to the Formspree URL with method POST.

## How to get to it (user POV)

- Choose `Contact` in the header (or mobile menu).
- Open `/contact/` directly.

## Driving it with Playwright

Preconditions:

- `serve.sh doctor` reports `OK`.
- Block Formspree for the context so nothing can send: `await ctx.route('https://formspree.io/**', r => r.abort())`.

- **Fields.** Load `/contact/`. `getByLabel('First Name')`, `getByLabel('Last Name')`, `getByLabel('Email')`, `getByLabel('Subject')`, `getByLabel('Message')` each exist and are `required`. Three `input[name="inquiring_about"]` checkboxes exist.
- **Action.** `form.form` has `method="POST"` and `action` starting `https://formspree.io/f/`. The owner has not yet set the real ID, so `YOUR_FORM_ID` is expected.
- **Validation.** Click `button.btn-submit` with the form empty. The URL stays `/contact/`, no request to formspree.io is made, and `input:invalid` matches the first required field (`#fname`).
- **Bad email.** Fill every required field, but put `not-an-email` in `#email`; submit. `#email` is `:invalid` and nothing is sent.
- **Proof.** Screenshot the form with the validation bubble state (focus on `#fname`) at both viewports and record the route handler saw zero requests.

## Gotchas

- Never remove the Formspree route block; a valid fill plus click sends a real email to the church.
- Do not assert a success page. With the placeholder ID Formspree returns an error; a successful submit cannot be proven locally.
- Checkboxes share `name="inquiring_about"`; select by value, not by index.
- Native validation bubbles do not appear in headless screenshots; assert `:invalid` and the unchanged URL instead.
