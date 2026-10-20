document.addEventListener('DOMContentLoaded', () => {
    const registrationSection = document.getElementById('registration');
    const form = document.getElementById('registration-form');
    const message = document.getElementById('form-message');
    const tariff = document.getElementById('form-tariff');
    const registerButtons = document.querySelectorAll('.btn-register');

    registerButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (!registrationSection) {
                return;
            }

            const card = button.closest('.pricing-card');
            if (tariff) {
                const title = card?.querySelector('h3')?.textContent.trim();
                const price = card?.querySelector('.price')?.textContent.trim().replace(/\s+/g, '\u00a0');
                tariff.textContent = card ? `Выбран тариф: ${title}, ${price}` : '';
                tariff.hidden = !card;
            }

            registrationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // На телефоне кнопка записи висит внизу экрана, пока не видны другие кнопки записи и форма.
    const stickyCta = document.getElementById('sticky-cta');
    if (stickyCta && registrationSection && 'IntersectionObserver' in window) {
        const visible = new Set();
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    visible.add(entry.target);
                } else {
                    visible.delete(entry.target);
                }
            });
            stickyCta.hidden = visible.size > 0;
        });
        registerButtons.forEach((button) => observer.observe(button));
        observer.observe(registrationSection);
        stickyCta.querySelector('button')?.addEventListener('click', () => {
            registrationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    if (!form) {
        return;
    }

    // Те же проверки, что в api/submit.php, но по всем полям сразу и рядом с полем.
    const rules = {
        name: (value) => (value ? '' : 'Укажите имя.'),
        phone: (value) => (value ? '' : 'Укажите телефон.'),
        email: (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Укажите корректный e-mail.'),
        purpose: (value) => (value ? '' : 'Укажите цель прохождения курса.'),
    };

    const validateField = (field) => {
        const error = rules[field.name](field.value.trim());
        let hint = field.parentElement.querySelector('.field-error');

        if (!hint) {
            hint = document.createElement('span');
            hint.className = 'field-error';
            field.after(hint);
        }

        hint.textContent = error;
        field.classList.toggle('is-invalid', error !== '');
        field.classList.toggle('is-valid', error === '');
        field.setAttribute('aria-invalid', String(error !== ''));

        return error === '';
    };

    const fields = Object.keys(rules).map((name) => form.elements.namedItem(name)).filter(Boolean);

    form.noValidate = true;

    fields.forEach((field) => {
        field.addEventListener('input', () => {
            if (field.hasAttribute('aria-invalid')) {
                validateField(field);
            }
        });
        field.addEventListener('blur', () => {
            if (field.value.trim() !== '') {
                validateField(field);
            }
        });
    });

    const resetValidation = () => {
        fields.forEach((field) => {
            field.classList.remove('is-invalid', 'is-valid');
            field.removeAttribute('aria-invalid');
            field.parentElement.querySelector('.field-error')?.replaceChildren();
        });
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const invalid = fields.filter((field) => !validateField(field));
        if (invalid.length > 0) {
            if (message) {
                message.textContent = '';
                message.className = 'form-message';
            }
            invalid[0].focus();
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const submitText = submitButton?.textContent;
        const formData = new FormData(form);

        if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = true;
            submitButton.textContent = 'Отправляем…';
        }

        if (message) {
            message.textContent = '';
            message.className = 'form-message';
        }

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.ok) {
                throw new Error(data.error || 'Не удалось отправить заявку. Попробуйте ещё раз через минуту.');
            }

            if (message) {
                message.textContent = 'Спасибо, заявка принята! Мы позвоним по указанному телефону, чтобы подтвердить место и ответить на вопросы.';
                message.className = 'form-message success';
            }

            form.reset();
            resetValidation();
            if (tariff) {
                tariff.hidden = true;
            }
        } catch (error) {
            if (message) {
                message.textContent = error instanceof TypeError
                    ? 'Не удалось отправить заявку: нет связи с сервером. Проверьте интернет и попробуйте ещё раз.'
                    : error.message;
                message.className = 'form-message error';
            }
        } finally {
            if (submitButton instanceof HTMLButtonElement) {
                submitButton.disabled = false;
                submitButton.textContent = submitText;
            }

            message?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
});
