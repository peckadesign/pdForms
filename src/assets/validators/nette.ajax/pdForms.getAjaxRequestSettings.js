/**
 * @name pdForms.getAsyncRequestSetting
 * @author Radek Šerý <radek.sery@peckadesign.cz>
 *
 * This script is part of pdForms library. It implements helper function returning settings for nette ajax request based
 * on passed parameters. It can be directly used as a parameter for $.nette.ajax() function.
 */
(function () {

	var pdForms = window.pdForms || {};

	pdForms.getAjaxRequestSettings = function(elem, op, arg, data) {
		return {
			url: arg.ajaxUrl,
			data: (data ? data : null),
			timeout: 5000,
			spinner: '.pdforms-ajax-spinner--' + elem.id,
			off: ['snippets', 'history', 'unique', 'abort'],
			beforeSend: function(jqXHR, settings) {
				elem.classList ?
					elem.classList.add('inp-loading') :
					elem.className += ' inp-loading';
			},
			success: function(payload) {
				var status = payload.status || (payload.valid ? 'valid' : 'invalid');

				pdForms.ajaxEvaluate(elem, op, status, payload, arg);
			},
			error: function(jqXHR, status, error, settings) {
				pdForms.ajaxEvaluate(elem, op, error, undefined, arg);
			},
			complete: function(jqXHR, status, settings) {
				elem.classList ?
					elem.classList.remove('inp-loading') :
					elem.className = (' ' + elem.className + ' ').replace(' inp-loading ', ' ').trim();
			}
		};
	};

	window.pdForms = pdForms;

})();
