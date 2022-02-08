/**
 * @name pdForms.recaptcha.nette.ajax
 * @author Radek Šerý <radek.sery@peckadesign.cz>
 *
 * Lazyload of recaptcha scripts and lazy binding the validation after interaction with form (eg. focus into input or
 * change of radio button, etc.). This version also works with forms submitted using nette.ajax.
 */
(function () {
	var pdForms = window.pdForms || {};


	if ('recaptcha' in pdForms) {
		return;
	}


	window.pdFormsRecaptchaLoadCallback = function() {
		pdForms.recaptcha.render();
	};


	function isNetteAjaxForm(form) {
		if (typeof $ === 'undefined' || typeof $.nette === 'undefined') {
			return false;
		}

		if ((' ' + form.className + ' ').indexOf(' ajax ') > -1) {
			return true;
		}

		if (form['nette-submittedBy'] && (' ' + form['nette-submittedBy'].className + ' ').indexOf(' ajax ') > -1) {
			return true;
		}

		return false;
	}


	function doSubmit(form) {
		// Take care of $.nette.ajax
		if (isNetteAjaxForm(form)) {
			var initExt = $.nette.ext('init');

			if (form['nette-submittedBy'] && form['nette-submittedBy'].matches(initExt.buttonSelector)) {
				$(form['nette-submittedBy']).trigger('click.nette');
			}
			else {
				$(form).submit();
			}
		}
		else {
			form.submit();
		}
	}

	pdForms.recaptcha = {
		loadApiScript: function() {
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = 'https://www.google.com/recaptcha/api.js?onload=pdFormsRecaptchaLoadCallback&render=explicit';

			document.documentElement.append(script);
		},

		initForm: function(htmlId) {
			var form = document.getElementById(htmlId);

			if (form.length) {
				form.addEventListener('focusin', pdForms.recaptcha.bind);
			}
		},

		bind: function(e) {
			if (! e.target.matches('select, input, textarea')) {
				return;
			}

			this.removeEventListener('focusin', pdForms.recaptcha.bind);

			if (typeof grecaptcha === 'undefined') {
				pdForms.recaptcha.loadApiScript();
			}
			else {
				pdForms.recaptcha.render(this);
			}
		},

		render: function(context) {
			context = context || document;

			var items = context.getElementsByClassName('g-recaptcha');
			var length = items.length;

			if (length > 0) {
				grecaptcha.ready(function () {
					for (var i = 0; i < length; i++) {
						(function(item) {
							if (item.getAttribute('data-widget-id')) {
								return;
							}

							var form = item.closest('form');
							var widgetId = grecaptcha.render(item, {
								callback: function(token) {
									var inputs = form.getElementsByClassName('g-recaptcha-response');
									for (var i = 0; i < inputs.length; i++) {
										inputs[i].value = token;
									}

									doSubmit(form);
								}
							});

							var validateRecaptcha = function(e) {
								// Form is already validated from Nette.validateForm, so if it was invalid, we can stop here
								if (e.defaultPrevented) {
									return false;
								}

								if (grecaptcha.getResponse(widgetId) === '') {
									grecaptcha.execute(widgetId);

									e.preventDefault();
									e.stopPropagation();
									return false;
								}

								return true;
							};

							form.addEventListener('submit', validateRecaptcha);

							// If $.nette.ajax is loaded, we need to take care of it
							if (typeof $ !== 'undefined' && $.nette) {
								var initExt = $.nette.ext('init');
								var selector = $(form).hasClass('ajax') ? initExt.buttonSelector.replace(/form.ajax /gi, '') : initExt.buttonSelector;

								$(form)
									.on('click', selector, function(e) {
										// Validation is binded to submit event which doesn't occur now, we have to validate manually
										if (Nette.validateForm(this.form)) {
											this.form['nette-submittedBy'] = this;
											validateRecaptcha.call(this, e);
										}
										else {
											e.preventDefault();
											e.stopPropagation();
										}
									});
							}

							item.setAttribute('data-widget-id', widgetId);

						})(items.item(i));
					}
				});
			}
		}
	};

	window.pdForms = pdForms;


})();
