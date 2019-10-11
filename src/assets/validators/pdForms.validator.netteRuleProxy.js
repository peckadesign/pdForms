/**
 * @name pdForms.validator.netteRuleProxy
 * @author Radek Šerý <radek.sery@peckadesign.cz>
 *
 * Implementation of proxy rule. This rule is used for optional validating using other Nette validators.
 */
(function() {

	Nette.validators.PdFormsRules_netteRuleProxy = function (elem, arg, val) {
		var validator = pdForms.formatOperation(arg.context.netteRule);

		return validator in Nette.validators ? Nette.validators[validator](elem, arg.context.netteRuleArgs, val) : true;
	};

})();
