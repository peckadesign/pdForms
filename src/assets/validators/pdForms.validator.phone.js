/**
 * @name pdForms.validator.phone
 * @author Radek Šerý <radek.sery@peckadesign.cz>
 *
 * Implementation for phone validator.
 */
(function() {

	Nette.validators.PdFormsRules_phone = function(elem, arg, val) {
		return Nette.validators.regexp(elem, String(/^\+[0-9]{3} ?[1-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}$/), val);
	};

})();
