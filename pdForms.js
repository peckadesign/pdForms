/**
 * pdForms
 * - adds custom validation rules for optional rule (non-blocking errors, form can be still submitted)
 * - changes some netteForms methods
 * - add support for "asynchronous" validation rules - validation depends on async AJAX response; limitations:
 *   - async rule cannot be used as condition!
 *   - async rule cannot be used as non-optional (blocking), may be fixed someday
 *
 * Created by Radek Šerý and Vít Kutný
 */

var pdForms = pdForms || {};


/**
 * Constants for messages. Used in CSS class names.
 */
pdForms.const = {
	ERROR_MESSAGE: 'error',
	INFO_MESSAGE: 'info',
	OK_MESSAGE: 'ok',

	toString: function() {
		var s = '';

		for (var i in this) {
			s += (typeof this[i] !== 'function') ? ' ' + String(this[i]) : '';
		}

		return s.slice(1);
	}
};


pdForms.isRuleOptional = function(rule) {
	return 'arg' in rule && typeof rule.arg === 'object' && 'optional' in rule.arg && rule.arg.optional;
};


/**
 * Validates ever-focused inputs, using data-nette-rules and data-pd-rules. Validates all grouped elements together.
 * This function is not used when validating whole form, eg. by submit event.
 */
pdForms.validateInput = function(e, $inputs) {
	var $validate = $(this);

	if (groupName = $(this).data('validation-group')) {
		$validate = $inputs.filter(function() {
			return $(this).data('validation-group') == groupName;
		});
	}

	$validate.each(function() {
		if ($(this).data('ever-focused')) {
			// validate control using nette-rules && pd-rules (which are inside nette-rules actually)
			Nette.validateControl(this);
		}
	});
};


/**
 * Validates form element using optional nette-rules.
 */
pdForms.validateControl = function(elem, rules) {
	// validate rules one-by-one to know which passed
	for (var id = 0, len = rules.length; id < len; id++) {
		var op = pdForms.formatOperation(rules[id].op);
		var async = op in pdForms.asyncCallbacks;

		// if async validator is used, validate & push into queue of not-yet resolved rules
		if (async) {
			var key = pdForms.asyncGetQueueKey(elem, op);
			pdForms.asyncQueue[key] = rules[id].msg;
		}

		var valid = tmp_Nette_validateControl(elem, [rules[id]], true);

		// if rule is async, then do not write any message
		if (! async) {
			if (! valid) {
				pdForms.addMessage(elem, rules[id].msg.invalid, pdForms.const.INFO_MESSAGE);
			}
			else if ('valid' in rules[id].msg) {
				pdForms.addMessage(elem, rules[id].msg.valid, pdForms.const.OK_MESSAGE);
			}
		}
	}
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
 * Queue of asynchronous validation rules which has not been yet processed.
 */
pdForms.asyncQueue = {};


/**
 * Get key to async queue for given element and operation
 */
pdForms.asyncGetQueueKey = function(elem, op) {
	return elem.getAttribute('id') + '--' + op;
};


/**
 * Returns default settings for AJAX rules based on parameters. Either to be used directly as param for $.nette.ajax
 * call or as a default settings to be extended by custom properties.
 */
pdForms.asyncRequestSettings = function(elem, op, url, data) {
	return {
		url: url,
		data: (data ? data : null),
		timeout: 5000,
		spinner: '.ajax-validation-spinner',
		off: ['snippets', 'history'],
		beforeSend: function(jqXHR, settings) {
			$(elem).addClass('inp-loading');
		},
		success: function(payload) {
			pdForms.asyncEvaluate(elem, op, payload.valid ? 'valid' : 'invalid', payload);
		},
		error: function(jqXHR, status, error, settings) {
			pdForms.asyncEvaluate(elem, op, error);
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
pdForms.asyncEvaluate = function(elem, op, status, payload) {
	var key = pdForms.asyncGetQueueKey(elem, op);

	// found request in queue, otherwise do nothing
	if (key in pdForms.asyncQueue) {
		msg = pdForms.asyncQueue[key];
		delete pdForms.asyncQueue[key];

		// write validation result message
		if (status in msg && msg[status]) {
			switch (status) {
				case 'invalid':
				case 'timeout':
					pdForms.addMessage(elem, msg[status], pdForms.const.INFO_MESSAGE);
					break;

				case 'valid':
					pdForms.addMessage(elem, msg.valid, pdForms.const.OK_MESSAGE);
					break;
			}
		}

		// process callback if any
		if (op in pdForms.asyncCallbacks && typeof pdForms.asyncCallbacks[op] === 'function') {
			pdForms.asyncCallbacks[op](elem, payload);
		}
	}
};


/**
 * Callbacks for asynchronous rules, called on success. Every asynchronous rule must be a property in this object. Either
 * function (then it is used as callback when rule-associated AJAX completes) or any other value (then it is used just to
 * identify a rule as asynchronous).
 */
pdForms.asyncCallbacks = {
	'PdFormsRules_validTIN': function(elem, payload) {
		if (typeof payload === 'object' && 'valid' in payload && payload.valid) {
			var fields = {
				name: '[company][name]',
				vatNumber: '[company][ico]'
			};

			for (var i in fields) {
				if (i in payload && payload[i] && ($inp = $('input[name$="' + fields[i] + '"]')).length && $inp.val() === '') {
					$inp.val(payload[i])
						.triggerHandler('blur');
				}
			}
		}
	}
};


/**
 * Display message. Either input associated or (if appropriate selector not found) as "global" form message.
 * Message placeholding:
 * 	1. First we try to find elements parent .pdforms-messages-input
 * 	2. If there is not any, then try to find closest p
 * 	3. If still no success, try to find .pdforms-messages-global
 *
 * If two or more inputs with validation rules are in same message placeholder (eg. <p> or .pdforms-messages-input), the
 * validation won't work as expected - class .error will be determined by last validated input in the placeholder and
 * messages may disappear unexpectedly :) In that case, you might be better with using .pdforms-messages-global or splitting
 * the <p> (.pdforms-messages-input) to two.
 *
 * Using data-pdforms-messages-prepend we could prepend the message to placeholder found in previous steps.
 * Using data-pdforms-messages-tagname we could change the default span (p in case of global messages) element.
 * Using data-pdforms-messages-global on elem we could force the message to be displayed in global message placeholder.
 */
pdForms.addMessage = function(elem, message, type) {
	if (! message)
		return false;

	if (! type in pdForms.const)
		type = pdForms.const.ERROR_MESSAGE;

	var tagName = 'span';
	var className = 'inp-' + type;
	var globalMessage = $(elem).data('pdforms-messages-global') || false;

	var $placeholder = $(elem).closest('.pdforms-messages-input');
	var $msg = '';

	if ($placeholder.length === 0) {
		$placeholder = $(elem).closest('p');
	}

	if ((globalMessage || $placeholder.length === 0) && ($placeholder = $(elem).closest('form').find('.pdforms-messages-global')).length) {
		tagName = 'p';
		globalMessage = true;
	}

	if ($placeholder.length) {
		// global message or non-error message or first error message
		if (globalMessage || type !== pdForms.const.ERROR_MESSAGE || (type === pdForms.const.ERROR_MESSAGE && ! $placeholder.hasClass(type))) {
			tagName = $placeholder.data('pdforms-messages-tagname') || tagName;
			className = (tagName === 'p') ? 'message ' + type + '-message' : className;

			$msg = $('<' + tagName + ' class="' + className + ' pdforms-message" data-elem="' + $(elem).attr('name') + '">' + message + '</' + tagName + '>');

			if (! globalMessage)
				$placeholder.addClass(type);
			$(elem).closest('.pdforms-messages-input, p').addClass(type);


			$placeholder.data('pdforms-messages-prepend') ? $placeholder.prepend($msg) : $placeholder.append($msg);
		}
	}
};


/**
 * Removes all messages associated with input.
 */
pdForms.removeMessages = function(elem) {
	var $placeholder = $(elem).parents('p, .pdforms-messages-input');

	$placeholder.removeClass(String(pdForms.const));
	$placeholder.find('.pdforms-message').remove();


	// global messages
	var name = $(elem).attr('name');
	$global = $(elem).closest('form').find('.pdforms-messages-global');
	$global
		.find('.pdforms-message')
		.filter(function() {
			return $(this).data('elem') === name;
		})
		.remove();
};


/**
 * pd-rules
 */
pdForms.validators = {
	'PdFormsRules_containsNumber': function(elem, arg, val) {
		return Nette.validators.regexp(elem, String(/\d+/), val);
	},

	'PdFormsRules_phone': function(elem, arg, val) {
		return Nette.validators.regexp(elem, String(/^\+[0-9]{3} ?[1-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}$/), val);
	},

	'PdFormsRules_validTIN': function(elem, arg, val) {
		$.nette.ajax(
			pdForms.asyncRequestSettings(elem, 'PdFormsRules_validTIN', arg, { dic: val })
		);

		return true;
	}
};


/**
 * Display error message.
 */
Nette.addError = function(elem, message) {
	pdForms.addMessage(elem, message, pdForms.const.ERROR_MESSAGE);
};


/**
 * Validates single rule. If there is no validator in Nette.validators, then try to use pdForms.validators.
 */
var tmp_Nette_validateRule = Nette.validateRule;
Nette.validateRule = function(elem, op, arg) {
	var ret = tmp_Nette_validateRule(elem, op, arg);

	if (ret === null) {
		op = pdForms.formatOperation(op);

		var val = Nette.getEffectiveValue(elem);
		var arr = Nette.isArray(arg) ? arg.slice(0) : [arg];
		for (var i = 0, len = arr.length; i < len; i++) {
			arr[i] = Nette.expandRuleArgument(elem, arr[i]);
		}
		return pdForms.validators[op] ? pdForms.validators[op](elem, Nette.isArray(arg) ? arr : arr[0], val) : null;
	}
	else {
		return ret;
	}
};


/**
 *
 */
var tmp_Nette_validateControl = Nette.validateControl;
Nette.validateControl = function(elem, rules, onlyCheck) {

	if (!elem.nodeName) { // RadioNodeList
		elem = elem[0];
	}
	rules = rules || Nette.parseJSON(elem.getAttribute('data-nette-rules'));

	// no rules -> skip element validation
	if (rules.length === 0)
		return true;

	// shallow copy only!
	var netteRules = rules.slice(0);
	var pdRules = rules.slice(0);

	netteRules = netteRules.filter(function (rule) {
		return ! pdForms.isRuleOptional(rule);
	});

	pdRules = pdRules.filter(function (rule) {
		return pdForms.isRuleOptional(rule);
	});

	for (var i in netteRules) {
		if ('msg' in netteRules[i] && typeof netteRules[i].msg === 'object' && 'invalid' in netteRules[i].msg) {
			netteRules[i].msg = netteRules[i].msg.invalid;
		}
	}

	// netteRules and pdRules are shallow copy of rules, therefore rules itself inside them are stored as references and might be edited
	for (var j in rules) {
		if ('arg' in rules[j] && typeof rules[j].arg === 'object' && 'data' in rules[j].arg) {
			rules[j].arg = rules[j].arg.data;
		}
	}

	// assumes the input is valid, therefore removing all messages
	pdForms.removeMessages(elem);

	// validate
	ret = tmp_Nette_validateControl(elem, netteRules, onlyCheck);

	pdForms.validateControl(elem, pdRules);

	return ret;
};


/**
 * Setup handlers.
 */
var tmp_Nette_initForm = Nette.initForm;
Nette.initForm = function (form) {
	tmp_Nette_initForm(form);

	var $form = $(form);
	var $submit = $form.find(':submit');
	var $inputs = $form.find('input:not(:button, :reset), textarea, select').filter('[data-nette-rules], [data-validation-group]'); // validate only fields with rules or fields in group

	$inputs.on('focus change', function() {
		$(this).data('ever-focused', true);
	});

	var validateInputApplied = function (e) {
		$.proxy(pdForms.validateInput, this, e, $inputs)();
	};

	$inputs.filter(':not(:radio, :checkbox, select)').on('blur', validateInputApplied);
	$inputs.filter(':radio, :checkbox').on('change', validateInputApplied);
	$inputs.filter('select').on('blur change', validateInputApplied);
};
