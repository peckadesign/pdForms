/**
 * @name pdForms
 *
 * @author Radek Šerý <radek.sery@peckadesign.cz>
 * @author Vít Kutný <vit.kutny@peckadesign.cz>
 *
 * @version 1.3.8
 *
 * - adds custom validation rules for optional rule (non-blocking errors, form can be still submitted)
 * - changes some netteForms methods
 * - add support for "asynchronous" validation rules - validation depends on async AJAX response; limitations:
 *   - async rule cannot be used as condition! (might be possible by using similar technique as with mandatory async rules)
 *   - mandatory async rule won't block form submit (in JS), so the page reloads (form won't be submitted because of
 *     server side check), check the todo list
 *
 *  TODO:
 *  - mandatory async rules:
 *    - create new array asyncErrors
 *    - on async rule error (in asyncEvaluate), flag is stored in asyncErrors, if the same field is valid later, flag
 *      is removed; only mandatory rules will appear here
 *    - rewrite Nette.validateForm:
 *      - call original Nette.validateForm, if it returns false, return false, if true, proceed
 *      - in interval check if asyncQueue (unprocessed rules) is empty (doesn't contain any mandatory async rule)
 *      - when all mandatory async rules are processed (prior step is done), check if asyncErrors is empty - if so
 *        return true, otherwise return false
 */

var pdForms = pdForms || {};


/**
 * Version
 */
pdForms.version = '1.3.8';


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


pdForms.namespace = 'Pd\\Forms\\Rules::';


pdForms.isRuleOptional = function(rule) {
	return Boolean(rule.arg) && typeof rule.arg === 'object' && 'optional' in rule.arg && rule.arg.optional;
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
			var hasAsyncRule = pdForms.hasAsyncRule(rules);

			// has to be here and not inside validateControl as it should add ok class only if whole input is valid (not only parts of condional rule etc.)
			if (ret && ! hasAsyncRule) {
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
	// assumes the input is valid, therefore removing all messages except those associated with async rules; this
	// prevents flashing of message, when async rule is evaluated - async rules removes their messages when the async
	// rule is evaluated
	pdForms.removeMessages(elem, false);

	// validate rules one-by-one to know which passed
	for (var id = 0, len = rules.length; id < len; id++) {
		var op = pdForms.formatOperation(rules[id].op);
		var async = op in pdForms.asyncCallbacks;

		// if async validator is used, validate & push into queue of not-yet resolved rules
		if (async) {
			var key = pdForms.getAsyncQueueKey(elem, op);
			pdForms.asyncQueue[key] = {
				msg: rules[id].msg,
				optional: rules[id].optional,
				onlyCheck: onlyCheck
			};
		}

		var condition = !!rules[id].rules;
		var valid = tmp_Nette_validateControl(elem, [rules[id]], ! condition || onlyCheck);

		// if rule is async, then do not write any message
		if (! async) {
			if (! onlyCheck) {
				if (! valid) {
					var msg = typeof rules[id].msg === 'object' ? rules[id].msg.invalid : rules[id].msg;

					// if the rules[id] is sync and we have a new message, we need to remove previous messages
					// (including async rules associated); checking for message presence ensures that conditional rules
					// will show their message - their evaluating goes from deepest rule (where the message is defined),
					// therefore condition is evaluated at last and must not remove the message
					if (msg) {
						pdForms.removeMessages(elem, true);
					}
					pdForms.addMessage(elem, msg, rules[id].optional ? pdForms.constants.INFO_MESSAGE : pdForms.constants.ERROR_MESSAGE);
				}
				else if (typeof rules[id].msg === 'object' && 'valid' in rules[id].msg) {
					pdForms.addMessage(elem, rules[id].msg.valid, pdForms.constants.OK_MESSAGE);
				}
			}

			if (! valid && ! rules[id].optional) {
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
 * Checks if given rules contains any async rule
 */
pdForms.hasAsyncRule = function(rules) {
	for (var id = 0, len = rules.length; id < len; id++) {
		var op = pdForms.formatOperation(rules[id].op);

		if (op in pdForms.asyncCallbacks) {
			return true;
		}

		if (rules[id].rules) {
			var conditionalAsync = pdForms.hasAsyncRule(rules[id].rules);

			if (conditionalAsync) {
				return true;
			}
		}
	}

	return false;
};



/**
 * Queue of asynchronous validation rules which has not been yet processed.
 */
pdForms.asyncQueue = {};


/**
 * Get key to async queue for given element and operation
 */
pdForms.getAsyncQueueKey = function(elem, op) {
	return elem.getAttribute('id') + '--' + op;
};


/**
 * Returns default settings for AJAX rules based on parameters. Either to be used directly as param for $.nette.ajax
 * call or as a default settings to be extended by custom properties.
 */
pdForms.getAsyncRequestSettings = function(elem, op, arg, data) {
	return {
		url: arg.url,
		data: (data ? data : null),
		timeout: 5000,
		spinner: '.ajax-validation-spinner--' + elem.id,
		off: ['snippets', 'history', 'unique', 'abort'],
		beforeSend: function(jqXHR, settings) {
			$(elem).addClass('inp-loading');
		},
		success: function(payload) {
			var status = payload.status || (payload.valid ? 'valid' : 'invalid');

			pdForms.asyncEvaluate(elem, op, status, payload, arg);
		},
		error: function(jqXHR, status, error, settings) {
			pdForms.asyncEvaluate(elem, op, error, undefined, arg);
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
pdForms.asyncEvaluate = function(elem, op, status, payload, arg) {
	var key = pdForms.getAsyncQueueKey(elem, op);

	// found request in queue, otherwise do nothing
	if (key in pdForms.asyncQueue) {
		var msg = pdForms.asyncQueue[key].msg;
		var optional = pdForms.asyncQueue[key].optional;
		var onlyCheck = pdForms.asyncQueue[key].onlyCheck;
		delete pdForms.asyncQueue[key];

		// remove old messages
		pdForms.removeMessages(elem, true);

		// write validation result message
		if (! onlyCheck) {
			if (status in msg && msg[status]) {
				switch (status) {
					case 'invalid':
						pdForms.addMessage(elem, msg[status], optional ? pdForms.constants.INFO_MESSAGE : pdForms.constants.ERROR_MESSAGE, true);
						break;

					case 'valid':
						pdForms.addMessage(elem, msg[status], pdForms.constants.OK_MESSAGE, true);
						break;

					default:
						pdForms.addMessage(elem, msg[status], payload && payload.messageType ? payload.messageType : pdForms.constants.INFO_MESSAGE, true);
						break;
				}
			}
			else if (status === 'valid') {
				// add pdforms-valid class name if the input is valid and no message is specified
				pdForms.addMessage(elem, null, pdForms.constants.OK_MESSAGE, true);
			}
		}

		// process callback if any
		if (op in pdForms.asyncCallbacks && typeof pdForms.asyncCallbacks[op] === 'function') {
			pdForms.asyncCallbacks[op](elem, payload, arg);
		}
	}
};


/**
 * Callbacks for asynchronous rules, called on success. Every asynchronous rule must be a property in this object. Either
 * function (then it is used as callback when rule-associated AJAX completes) or any other value (then it is used just to
 * identify a rule as asynchronous).
 */
pdForms.asyncCallbacks = {
	'PdFormsRules_validTIN': function(elem, payload, arg) {
		if (typeof payload === 'object' && 'valid' in payload && payload.valid && 'inputs' in arg) {
			for (var input in arg.inputs) {
				if (arg.inputs.hasOwnProperty(input) && payload.hasOwnProperty(input)) {
					$input = $('#' + arg.inputs[input]);
					if ($input.length && ! $input.val()) {
						$input
							.val(payload[input])
							.trigger('change')
							.trigger('validate.pdForms');
					}
				}
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
pdForms.addMessage = function(elem, message, type, isAsyncRuleMessage) {
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

			if (isAsyncRuleMessage) {
				$msg.attr('data-async-rule', true);
			}

			if (tagName === 'label') {
				$msg.attr('for', $(elem).attr('id'));
			}

			$placeholder.data('pdforms-messages-prepend') ? $placeholder.prepend($msg) : $placeholder.append($msg);
		}
	}
};


/**
 * Removes all messages associated with input. By default removes messages associated with async rules as well, but that
 * can be changed not to.
 */
pdForms.removeMessages = function(elem, removeAsyncRulesMessages) {
	var name = $(elem).attr('name');

	// Default value should be true
	if (typeof removeAsyncRulesMessages === 'undefined') {
		removeAsyncRulesMessages = true;
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
				var isAsyncRuleMessage = $(this).data('async-rule');

				// Remove async rules associated messages only if removeAsyncRulesMessages is true
				var shouldRemove = isElemAssociatedMessage && (removeAsyncRulesMessages || (! removeAsyncRulesMessages && ! isAsyncRuleMessage));

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
			pdForms.getAsyncRequestSettings(elem, 'PdFormsRules_validTIN', arg, { dic: val })
		);

		return true;
	},

	'PdFormsRules_validICO': function(elem, arg, val) {
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
	}
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
 * Validates single rule. If there is no validator in Nette.validators, then try to use pdForms.validators.
 */
var tmp_Nette_validateRule = Nette.validateRule;
Nette.validateRule = function(elem, op, arg, value) {
	var ret = tmp_Nette_validateRule(elem, op.substring(0, pdForms.namespace.length) === pdForms.namespace ? op.substring(pdForms.namespace.length) : op, arg, value);

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

	for (var j in rules) {
		rules[j].optional = pdForms.isRuleOptional(rules[j]);
		if ('arg' in rules[j] && typeof rules[j].arg === 'object' && 'data' in rules[j].arg) {
			rules[j].arg = rules[j].arg.data;
		}
	}

	return pdForms.validateControl(elem, rules, onlyCheck);
};


/**
 * Setup handlers.
 */
var tmp_Nette_initForm = Nette.initForm;
Nette.initForm = function (form) {
	var $form = $(form);
	var $submit = $form.find(':submit');
	var $inputs = $form.find('input:not(:button, :reset), textarea, select').filter('[data-nette-rules], [data-validation-group]'); // validate only fields with rules or fields in group

	$form.off('.netteForms');
	$inputs.off('.pdForms .netteForms');

	tmp_Nette_initForm(form);

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
