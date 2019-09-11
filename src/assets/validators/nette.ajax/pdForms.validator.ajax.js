/**
 * @name pdForms.validator.ajax
 * @author Radek Šerý <radek.sery@peckadesign.cz>
 *
 * Implementation for AJAX validator using nette ajax library.
 */
(function() {

	Nette.validators.PdFormsRules_ajax = function(elem, arg, val, value, callback) {
		if (typeof callback === 'undefined') {
			callback = 'PdFormsRules_ajax';
		}

		var parameters = pdForms.getAjaxUrlParameters(elem, arg, val, value, callback);

		$.nette.ajax(
			pdForms.getAjaxRequestSettings(elem, callback, arg, parameters)
		);

		return true;
	};

})();
