/**
 * @name pdForms.validator.czechCompanyIdentifier
 * @author Radek Šerý <radek.sery@peckadesign.cz>
 *
 * Implementation for czechCompanyIdentifier validator. This validator validates correct format of czech IČO.
 */
(function() {

	Nette.validators.PdFormsRules_czechCompanyIdentifier  = function(elem, arg, val) {
		var a = 0;
		var b = 0;

		val = val.replace(/\s/g, '');

		if  (val.length !== 8 || ! Nette.validators.regexp(elem, String(/\d+/), val)) {
			return false;
		}

		for (var i = 0 ; i < 7; i++) {
			a += parseInt(val[i] * (8 - i));
		}

		a = a % 11;
		if (a === 0) {
			b = 1;
		} else if (a === 1) {
			b = 0;
		} else {
			b = 11 - a;
		}

		return parseInt(val[7]) === b;
	};

})();
