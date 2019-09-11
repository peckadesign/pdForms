/**
 * @name pdForms.validator.containsNumber
 * @author Radek Šerý <radek.sery@peckadesign.cz>
 *
 * Implementation for containsNumber validator. This validates if the text input contains any type of number.
 * This could be used eg. for check if street in address contains house number.
 */
(function() {

	Nette.validators.PdFormsRules_containsNumber = function(elem, arg, val) {
		return Nette.validators.regexp(elem, String(/\d+/), val);
	};

})();
