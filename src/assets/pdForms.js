/**
 * @name pdForms
 *
 * @author Radek Šerý <radek.sery@peckadesign.cz>
 * @author Vít Kutný <vit.kutny@peckadesign.cz>
 *
 * @version 1.4.0
 *
 * - adds custom validation rules for optional rule (non-blocking errors, form can be still submitted)
 * - changes some netteForms methods
 * - add support for "asynchronous" validation rules - validation depends on AJAX response; limitations:
 *   - ajax rule cannot be used as condition! (might be possible by using similar technique as with mandatory ajax rules)
 *   - mandatory ajax rule won't block form submit (in JS), so the page reloads (form won't be submitted because of
 *     server side check), check the todo list
 *
 *  TODO:
 *  - mandatory ajax rules:
 *    - create new array ajaxErrors
 *    - on ajax rule error (in ajaxEvaluate), flag is stored in ajaxErrors, if the same field is valid later, flag
 *      is removed; only mandatory rules will appear here
 *    - rewrite Nette.validateForm:
 *      - call original Nette.validateForm, if it returns false, return false, if true, proceed
 *      - in interval check if ajaxQueue (unprocessed rules) is empty (doesn't contain any mandatory ajax rule)
 *      - when all mandatory ajax rules are processed (prior step is done), check if ajaxErrors is empty - if so
 *        return true, otherwise return false
 */

var pdForms = pdForms || {};


/**
 * Version
 */
pdForms.version = '1.4.0';


/**
 * Nette methods which are later overridden
 */
pdForms.Nette = {
	validateControl: Nette.validateControl,
	toggleControl:   Nette.toggleControl,
	initForm:        Nette.initForm
};


/**
 * Constants for messages. Used in CSS class names.
 */
pdForms.constants = {
	ERROR_MESSAGE: 'error',
	INFO_MESSAGE: 'info',
	OK_MESSAGE: 'valid',

	// returns searialized class names, each one prefixed with "pdforms-" string
	toString: function() {
		var s = '';

		for (var i in this) {
			s += (typeof this[i] !== 'function') ? ' pdforms-' + String(this[i]) : '';
		}

		return s.slice(1);
	}
};


pdForms.isOptionalRule = function(rule) {
	return typeof rule.arg === 'object' && rule.arg.optional;
};


pdForms.isAjaxRule = function(rule) {
	return typeof rule.arg === 'object' && 'ajaxUrl' in rule.arg;
};


/**
 * Method converts rules from Pd format into Nette compatible format. There are two fags set - isOptional and isAjax -
 * and rule.msg is converted into an object.
 */
pdForms.normalizeRules = function(rules) {
	for (var j in rules) {
		var rule = rules[j];
		rule.isOptional = pdForms.isOptionalRule(rule);
		rule.isAjax = pdForms.isAjaxRule(rule);

		if (typeof rule.msg === 'undefined') {
			rule.msg = {};
		} else if (typeof rule.msg === 'string') {
			rule.msg = { 'invalid': rule.msg };
		}

		if (typeof rule.arg === 'object' && 'msg' in rule.arg) {
			for (var i in rule.arg.msg) {
				rule.msg[i] = rule.arg.msg[i];
			}
		}

		if (rule.rules) {
			rule.rules = pdForms.normalizeRules(rule.rules);
		}
	}

	return rules;
};


/**
 * Returns first rule with name op from rules or null.
 */
pdForms.getRuleByOp = function(rules, op) {
	for (var j in rules) {
		var rule = rules[j];

		if (pdForms.formatOperation(rule.op) === op) {
			return rule;
		} else if (rule.rules) {
			return pdForms.getRuleByOp(rule.rules, op);
		}
	}

	return null;
};


/**
 * Validates ever-focused inputs, using data-nette-rules and data-pd-rules. Validates all grouped elements together.
 * This function is not used when validating whole form, eg. by submit event.
 */
pdForms.validateInput = function(e, $inputs) {
	var $validate = $(this);

	if (groupName = $(this).data('validation-group')) {
		$validate = $inputs.filter(function() {
			return $(this).data('validation-group') === groupName;
		});
	}

	$validate.each(function() {
		if ($(this).data('ever-focused')) {
			// validate control using nette-rules && pd-rules (which are inside nette-rules actually)
			var ret = Nette.validateControl(this);

			var rules = Nette.parseJSON(this.getAttribute('data-nette-rules'));
			rules = pdForms.normalizeRules(rules);
			var hasAjaxRule = pdForms.hasAjaxRule(rules);

			// has to be here and not inside validateControl as it should add ok class only if whole input is valid (not only parts of condional rule etc.)
			if (ret && ! hasAjaxRule) {
				// add pdforms-valid class name if the input is valid
				pdForms.addMessage(this, null, pdForms.constants.OK_MESSAGE);
			}
		}
	});
};


/**
 * Validates form element using optional nette-rules.
 */
pdForms.validateControl = function(elem, rules, onlyCheck) {
	// assumes the input is valid, therefore removing all messages except those associated with ajax rules; this
	// prevents flashing of message, when ajax rule is evaluated - ajax rules removes their messages when the ajax
	// rule is evaluated; when onlyCheck is true, we dont' want to modify DOM at all
	if (! onlyCheck) {
		pdForms.removeMessages(elem, false);
	}

	// validate rules one-by-one to know which passed
	for (var id = 0, len = rules.length; id < len; id++) {
		var rule = rules[id];
		var op = pdForms.formatOperation(rule.op);

		// if ajax validator is used, validate & push into queue of not-yet resolved rules
		if (rule.isAjax) {
			var key = pdForms.getAjaxQueueKey(elem, op);
			pdForms.ajaxQueue[key] = {
				msg: rule.msg,
				isOptional: rule.isOptional,
				onlyCheck: onlyCheck
			};
		}

		var condition = !!rule.rules;
		var valid = pdForms.Nette.validateControl(elem, [rule], ! condition || onlyCheck);

		// if rule is ajax, then do not write any message
		if (! rule.isAjax) {
			if (! onlyCheck) {
				if (! valid) {
					// if the rule is sync and we have a new message, we need to remove previous messages
					// (including ajax rules associated); checking for message presence ensures that conditional rules
					// will show their message - their evaluating goes from deepest rule (where the message is defined),
					// therefore condition is evaluated at last and must not remove the message
					if (rule.msg.invalid) {
						pdForms.removeMessages(elem, true);
					}
					pdForms.addMessage(elem, rule.msg.invalid, rule.isOptional ? pdForms.constants.INFO_MESSAGE : pdForms.constants.ERROR_MESSAGE);
				}
				else if (rule.msg.valid) {
					pdForms.addMessage(elem, rule.msg.valid, pdForms.constants.OK_MESSAGE);
				}
			}

			if (! valid && ! rule.isOptional) {
				return valid;
			}
		}
	}

	return true;
};


pdForms.formatOperation = function(op) {
	if (op.charAt(0) === ':') {
		op = op.substr(1);
	}
	op = op.replace('::', '_');
	op = op.replace(/\\/g, '');

	return op;
};


/**
 * Checks if given rules contains any ajax rule
 */
pdForms.hasAjaxRule = function(rules) {
	for (var id = 0, len = rules.length; id < len; id++) {
		if (rules[id].isAjax || (rules[id].rules && pdForms.hasAjaxRule(rules[id].rules))) {
			return true;
		}
	}

	return false;
};



/**
 * Queue of ajax validation rules which has not been yet processed.
 */
pdForms.ajaxQueue = {};


/**
 * Get key to ajax queue for given element and operation
 */
pdForms.getAjaxQueueKey = function(elem, op) {
	return elem.getAttribute('id') + '--' + op;
};


/**
 * Returns default settings for AJAX rules based on parameters. Either to be used directly as param for $.nette.ajax
 * call or as a default settings to be extended by custom properties.
 */
pdForms.getAjaxRequestSettings = function(elem, op, arg, data) {
	return {
		url: arg.ajaxUrl,
		data: (data ? data : null),
		timeout: 5000,
		spinner: '.pdforms-ajax-spinner--' + elem.id,
		off: ['snippets', 'history', 'unique', 'abort'],
		beforeSend: function(jqXHR, settings) {
			$(elem).addClass('inp-loading');
		},
		success: function(payload) {
			var status = payload.status || (payload.valid ? 'valid' : 'invalid');

			pdForms.ajaxEvaluate(elem, op, status, payload, arg);
		},
		error: function(jqXHR, status, error, settings) {
			pdForms.ajaxEvaluate(elem, op, error, undefined, arg);
		},
		complete: function(jqXHR, status, settings) {
			$(elem).removeClass('inp-loading');
		}
	};
};



/**
 * For given element and operation write validation result message and remove from queue; called by AJAX validator
 * after response is received.
 */
pdForms.ajaxEvaluate = function(elem, op, status, payload, arg) {
	var key = pdForms.getAjaxQueueKey(elem, op);

	// found request in queue, otherwise do nothing
	if (key in pdForms.ajaxQueue) {
		var msg = pdForms.ajaxQueue[key].msg;
		var isOptional = pdForms.ajaxQueue[key].isOptional;
		var onlyCheck = pdForms.ajaxQueue[key].onlyCheck;
		delete pdForms.ajaxQueue[key];

		// write validation result message
		if (! onlyCheck) {
			// remove old messages, only when onlyCheck is false
			pdForms.removeMessages(elem, true);

			if (status in msg && msg[status]) {
				var msgType = pdForms.constants.ERROR_MESSAGE;

				if (typeof payload === 'object' && payload.messageType) {
					msgType = payload.messageType;
				} else if (status === 'invalid' && ! isOptional) {
					msgType = pdForms.constants.ERROR_MESSAGE;
				} else if (status === 'valid') {
					msgType = pdForms.constants.OK_MESSAGE;
				}

				if (isOptional && msgType === pdForms.constants.ERROR_MESSAGE) {
					msgType = pdForms.constants.INFO_MESSAGE;
				}

				pdForms.addMessage(elem, msg[status], msgType, true);
			}
			else if (status === 'valid') {
				// add pdforms-valid class name if the input is valid and no message is specified
				pdForms.addMessage(elem, null, pdForms.constants.OK_MESSAGE, true);
			}
		}


		// fill in input fields recieved in payload
		pdForms.ajaxFillDependentInputs(elem, payload, arg);


		// process callback if any
		if (typeof pdForms.ajaxCallbacks[op] === 'function') {
			pdForms.ajaxCallbacks[op](elem, payload, arg);
		}
	}
};

pdForms.ajaxCallbacks = pdForms.ajaxCallbacks || {};

/**
 * Fill in values into inputs defined in arg.inputs if the value is defined in payload.
 */
pdForms.ajaxFillDependentInputs = function(elem, payload, arg) {
	if (typeof payload === 'object' && payload.valid && typeof payload.dependentInputs === 'object' && typeof arg === 'object' && typeof arg.dependentInputs === 'object') {
		for (var inputName in arg.dependentInputs) {
			if (! arg.dependentInputs.hasOwnProperty(inputName)) {
				continue;
			}

			var inputId = arg.dependentInputs[inputName];

			if (! payload.dependentInputs.hasOwnProperty(inputId)) {
				continue;
			}

			var input = document.getElementById(inputId);

			if (input && ! input.value) {
				$(input)
					.val(payload.dependentInputs[inputId])
					.trigger('change')
					.trigger('validate.pdForms');
			}
		}
	}
};


/**
 * Display message. Either input associated or (if appropriate selector not found) as "global" form message.
 * Message placeholding:
 * 	1. First we try to find elements parent .pdforms-messages--input
 * 	2. If there is not any, then try to find closest p
 * 	3. If still no success, try to find .pdforms-messages--global
 *
 * If two or more inputs with validation rules are in same message placeholder (eg. <p> or .pdforms-messages--input), the
 * validation won't work as expected - class .error will be determined by last validated input in the placeholder and
 * messages may disappear unexpectedly :) In that case, you might be better with using .pdforms-messages--global or splitting
 * the <p> (.pdforms-messages--input) to two.
 *
 * Using data-pdforms-messages-prepend we could prepend the message to placeholder found in previous steps.
 * Using data-pdforms-messages-tagname we could change the default span (p in case of global messages) element.
 * Using data-pdforms-messages--global on elem we could force the message to be displayed in global message placeholder.
 */
pdForms.addMessage = function(elem, message, type, isAjaxRuleMessage) {
	if (! type in pdForms.constants) {
		type = pdForms.constants.ERROR_MESSAGE;
	}

	var $placeholder = $(elem).closest('.pdforms-messages--input');
	if ($placeholder.length === 0) {
		$placeholder = $(elem).closest('p');
	}

	if ($placeholder.length) {
		$placeholder.addClass('pdforms-' + type);
	}

	if (! message) {
		return false;
	}

	var tagName = 'label';
	var className = 'inp-' + type;
	var globalMessage = $(elem).data('pdforms-messages--global') || false;

	var $msg = '';

	if ((globalMessage || $placeholder.length === 0) && ($placeholder = $(elem).closest('form').find('.pdforms-messages--global')).length) {
		tagName = 'p';
		globalMessage = true;
	}

	if ($placeholder.length) {
		// global message or non-error message or first error message
		if (globalMessage || type !== pdForms.constants.ERROR_MESSAGE || (type === pdForms.constants.ERROR_MESSAGE && ! $placeholder.hasClass(type))) {
			tagName = $placeholder.data('pdforms-messages-tagname') || tagName;
			className = (tagName === 'p') ? 'message message--' + type : className;

			$msg = $('<' + tagName + ' class="' + className + ' pdforms-message" data-elem="' + $(elem).attr('name') + '">' + message + '</' + tagName + '>');

			if (isAjaxRuleMessage) {
				$msg.attr('data-ajax-rule', true);
			}

			if (tagName === 'label') {
				$msg.attr('for', $(elem).attr('id'));
			}

			$placeholder.data('pdforms-messages-prepend') ? $placeholder.prepend($msg) : $placeholder.append($msg);
		}
	}
};


/**
 * Removes all messages associated with input. By default removes messages associated with ajax rules as well, but that
 * can be changed not to.
 */
pdForms.removeMessages = function(elem, removeAjaxRulesMessages) {
	var name = $(elem).attr('name');

	// Default value should be true
	if (typeof removeAjaxRulesMessages === 'undefined') {
		removeAjaxRulesMessages = true;
	}

	// Find placeholders for input (input and global)
	var $placeholder = $(elem).closest('.pdforms-messages--input');
	if ($placeholder.length === 0) {
		$placeholder = $(elem).closest('p');
	}
	var $globalPlaceholder = $(elem).closest('form').find('.pdforms-messages--global');


	// Find all messages associated with the elem
	var $messages = {
		'input': $placeholder.find('.pdforms-message'),
		'global': $globalPlaceholder.find('.pdforms-message')
	};
	var $removeMessages = $([]);

	// Filter all messages for deleting
	for (var key in $messages) {
		if ($messages.hasOwnProperty(key)) {

			$messages[key] = $messages[key].filter(function() {
				var isElemAssociatedMessage = $(this).data('elem') === name;
				var isAjaxRuleMessage = $(this).data('ajax-rule');

				// Remove ajax rules associated messages only if removeAjaxRulesMessages is true
				var shouldRemove = isElemAssociatedMessage && (removeAjaxRulesMessages || (! removeAjaxRulesMessages && ! isAjaxRuleMessage));

				if (shouldRemove) {
					$removeMessages = $removeMessages.add(this);
				}

				return ! shouldRemove;
			});

		}
	}

	// If there is no message remaining in .pdforms-messages--input placeholder, then remove the placeholder class as well.
	if ($messages.input.length === 0) {
		$placeholder.removeClass(String(pdForms.constants));
	}

	// Remove the messages
	$removeMessages.remove();
};


pdForms.getAjaxUrlParameters = function(elem, arg, val, value, callback) {
	var parameters = {
		inputValue: val,
		dependentInputs: {}
	};

	for (var i in arg.dependentInputs) {
		parameters.dependentInputs[i] = {
			htmlId: arg.dependentInputs[i],
			value: document.getElementById(arg.dependentInputs[i]).value
		}
	}

	return parameters;
};


/**
 * pd-rules
 */
Nette.validators.PdFormsRules_containsNumber = function(elem, arg, val) {
	return Nette.validators.regexp(elem, String(/\d+/), val);
};

Nette.validators.PdFormsRules_phone = function(elem, arg, val) {
	return Nette.validators.regexp(elem, String(/^\+[0-9]{3} ?[1-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}$/), val);
};

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

Nette.validators.PdFormsRules_validICO = function(elem, arg, val) {
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


/*
 * Trochu špinavý trik? Kvůli snippetům uvnitř formuláře je potřeba navázat callbacky takovým způsobem, aby bylo možné
 * je později odpojit, viz Nette.addEvent níže. Extension validation v nette.ajax ale pro netteForm verze 2.3 (nebo
 * neuvedené) kontroluje onsubmit property na formuláři a tu volá pro zvalidování (viz původní Nette.addEvent metoda).
 * Od verze 2.4 ale (v případě, že onsubmit není, jinak použije funkci v onsubmit) volá validaci formuláře napřímo
 * pomocí Nette.validateForm. Protože podmínka je na undefined nebo "2.3", jakýkoli jiný řetězec, stačí uvést třeba toto
 * a všechno funguje jak má. Snad. Don't panic.
 */
Nette.version = '2.3-pd';


/**
 * Display error message.
 */
Nette.addError = function(elem, message) {
	pdForms.addMessage(elem, message, pdForms.constants.ERROR_MESSAGE);
};


/**
 * Add event to element using jQuery namespaces
 */
Nette.addEvent = function(element, on, callback) {
	$(element).on(on + '.netteForms', callback);
};


/**
 *
 */
Nette.validateControl = function(elem, rules, onlyCheck) {

	if (!elem.nodeName) { // RadioNodeList
		elem = elem[0];
	}
	rules = rules || Nette.parseJSON(elem.getAttribute('data-nette-rules'));

	// no rules -> skip element validation
	if (rules.length === 0) {
		return true;
	}

	// convert arg property in rules into Nette format
	rules = pdForms.normalizeRules(rules);

	return pdForms.validateControl(elem, rules, onlyCheck);
};


/**
 *
 */
Nette.toggleControl = function(elem, rules, success, firsttime, value) {
	// convert arg property in rules into Nette format
	rules = pdForms.normalizeRules(rules);

	pdForms.Nette.toggleControl(elem, rules, success, firsttime, value);
};


/**
 * Setup handlers.
 */
Nette.initForm = function (form) {
	var $form = $(form);
	var $submit = $form.find(':submit');
	var $inputs = $form.find('input:not(:button, :reset), textarea, select').filter('[data-nette-rules], [data-validation-group]'); // validate only fields with rules or fields in group

	$form.off('.netteForms');
	$inputs.off('.pdForms .netteForms');

	pdForms.Nette.initForm(form);

	$inputs.on('focus.pdForms change.pdForms', function() {
		$(this).data('ever-focused', true);
	});

	var validateInputApplied = function (e) {
		$.proxy(pdForms.validateInput, this, e, $inputs)();
	};

	$inputs.filter(':not(:radio, :checkbox, select, [data-pdforms-validate-on])').on('validate.pdForms blur.pdForms', validateInputApplied);
	$inputs.filter(':radio, :checkbox').on('validate.pdForms change.pdForms', validateInputApplied);
	$inputs.filter('select').on('validate.pdForms blur.pdForms change.pdForms', validateInputApplied);
	$inputs.filter('[data-pdforms-validate-on]').each(function() {
		$(this).on('validate.pdForms ' + $(this).data('pdforms-validate-on') + '.pdForms', validateInputApplied);
	});
};
