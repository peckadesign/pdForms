/**
 * @name pdForms
 * @author Radek Šerý <radek.sery@peckadesign.cz>
 * @version 3.6.2
 *
 * Features:
 * - live validation
 * - support for optional rules (non-blocking errors, form can be still submitted)
 * - support for "asynchronous" validation rules - validation depends on AJAX response; there are some limitations:
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
(function(global, factory) {
	if (!global.JSON) {
		return;
	}

	if (typeof define === 'function' && define.amd) {
		define(function() {
			return factory(global);
		});
	} else if (typeof module === 'object' && typeof module.exports === 'object') {
		module.exports = factory(global);
	} else {
		global.pdForms = factory(global);

		if (global.Nette) {
			global.Nette.initOnLoad();
		}
	}

}(typeof window !== 'undefined' ? window : this, function(window) {

	var pdForms = window.pdForms || {};

	pdForms.version = '3.6.2';


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
		MESSAGE_ERROR: 'error',
		MESSAGE_INFO: 'info',
		MESSAGE_VALID: 'valid'
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

			rule.msg.replace = function(reg, callback) {
				for (var i in this) {
					if (typeof this[i] === 'string') {
						this[i] = this[i].replace(reg, callback);
					}
				}

				return this;
			};

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
	pdForms.liveValidation = function(e) {
		// Validate event target or (in case of radio button) first radio of RadioNodeList. Nette sets the
		// data-nette-rules only for the first radio of given name, so we always validate that radio.
		var validate = (e.target.form[e.target.name] instanceof RadioNodeList) ? [e.target.form[e.target.name].item(0)] : [e.target];
		var groupName = e.target.getAttribute('data-pdforms-validation-group');

		if (groupName) {
			var elems = e.target.form.elements;
			for (var i = 0; i < elems.length; i++) {
				if (elems[i] !== e.target && elems[i].getAttribute('data-pdforms-validation-group') === groupName) {
					validate.push(elems[i]);
				}
			}
		}

		validate.forEach(function(elem) {
			if (elem.getAttribute('data-pdforms-ever-focused')) {
				// assumes the input is valid, therefore removing all messages except those associated with ajax rules; this
				// prevents flashing of message, when ajax rule is evaluated - ajax rules removes their messages when the ajax
				// rule is evaluated
				pdForms.removeMessages(elem, false);

				var rules = JSON.parse(elem.getAttribute('data-nette-rules') || '[]');
				rules = pdForms.normalizeRules(rules);

				// validate control using nette-rules && pd-rules (which are inside nette-rules actually)
				var valid = Nette.validateControl(elem, rules);
				var hasAjaxRule = pdForms.hasAjaxRule(rules);

				// has to be here and not inside validateControl as it should add ok class only if whole input is valid (not only parts of condional rule etc.)
				if (valid && ! hasAjaxRule) {
					// add pdforms-valid class name if the input is valid
					pdForms.addMessage(elem, null, pdForms.constants.MESSAGE_VALID);
				}
			}
		});
	};


	/**
	 * Validates form element using optional nette-rules.
	 */
	pdForms.validateControl = function(elem, rules, onlyCheck, value, emptyOptional) {
		// validate rules one-by-one to know which passed
		for (var id = 0, len = rules.length; id < len; id++) {
			var rule = rules[id];
			var op = pdForms.formatOperation(rule.op);

			// if ajax validator is used, validate & push into queue of not-yet resolved rules
			if (rule.isAjax) {
				var key = pdForms.getAjaxQueueKey(elem, op, rule.arg.ajaxUrl);
				pdForms.ajaxQueue[key] = {
					msg: rule.msg,
					isOptional: rule.isOptional,
					onlyCheck: onlyCheck
				};
			}

			if (rule.op === 'optional') {
				emptyOptional = !Nette.validateRule(elem, ':filled', null, value);
				continue;
			}

			var isCondition = !!rule.rules;
			var valid = pdForms.Nette.validateControl(elem, [rule], ! isCondition || onlyCheck, value, emptyOptional);

			if (! rule.isAjax) {
				// write message and add error to form
				if (! onlyCheck && ! isCondition) {
					if (! valid) {
						// if the rule is sync and we have a new message, we need to remove previous messages
						// (including ajax rules associated); checking for message presence ensures that conditional rules
						// will show their message - their evaluating goes from deepest rule (where the message is defined),
						// therefore condition is evaluated at last and must not remove the message
						if (rule.msg.invalid) {
							pdForms.removeMessages(elem, true);
						}

						pdForms.addMessage(elem, rule.msg.invalid, rule.isOptional ? pdForms.constants.MESSAGE_INFO : pdForms.constants.MESSAGE_ERROR);

						if (! rule.isOptional) {
							Nette.addError(elem, rule.msg.invalid);
						}
					}
					else if (rule.msg.valid) {
						pdForms.addMessage(elem, rule.msg.valid, pdForms.constants.MESSAGE_VALID);
					}
				}

				// return value
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
	pdForms.getAjaxQueueKey = function(elem, op, url) {
		return elem.getAttribute('id') + '--' + op + '--' + url;
	};


	/**
	 * For given element and operation write validation result message and remove from queue; called by AJAX validator
	 * after response is received.
	 */
	pdForms.ajaxEvaluate = function(elem, op, status, payload, arg) {
		var key = pdForms.getAjaxQueueKey(elem, op, arg.ajaxUrl);

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

				var msgType = pdForms.constants.MESSAGE_ERROR;

				if (typeof payload === 'object' && payload.messageType) {
					msgType = payload.messageType;
				} else if (status === 'timeout') {
					msgType = pdForms.constants.MESSAGE_INFO;
				} else if (status === 'valid') {
					msgType = pdForms.constants.MESSAGE_VALID;
				}

				if (isOptional && msgType === pdForms.constants.MESSAGE_ERROR) {
					msgType = pdForms.constants.MESSAGE_INFO;
				}

				if (typeof payload === 'object' && payload.message) {
					pdForms.addMessage(elem, payload.message, msgType, true, false);
				} else if (status in msg && msg[status]) {
					pdForms.addMessage(elem, msg[status], msgType, true);
				} else if (status === 'valid') {
					// add pdforms-valid class name if the input is valid and no message is specified
					pdForms.addMessage(elem, null, pdForms.constants.MESSAGE_VALID, true);
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
					pdForms.setInputValue(input, payload.dependentInputs[inputId]);
				}
			}
		}
	};


	pdForms.setInputValue = function (elem, value) {
		var ev = document.createEvent('Event');
		ev.initEvent('change', true, true);

		elem.value = value;
		elem.dispatchEvent(ev);
	};


	/**
	 * Find the placeholder element for a given input element.
	 */
	pdForms.getMessagePlaceholder = function(elem) {
		var placeholder = null;
		var isGlobal = elem.getAttribute('data-pdforms-messages-global') !== null;

		if (isGlobal) {
			placeholder = elem.form.querySelector('.pdforms-messages--global');

		} else {
			placeholder =
				elem.closest('.pdforms-messages--input') ||
				elem.closest('p');

			if (! placeholder) {
				placeholder = elem.form.querySelector('.pdforms-messages--global');
				isGlobal = true;
			}
		}

		return {
			elem: placeholder,
			isGlobal: isGlobal
		};
	};


	/**
	 * Returns class name used for generated message.
	 */
	pdForms.getMessageClassName = function (isGlobalMessage, tagName, type) {
		return (tagName === 'p') ? ('message message--' + type) : ('inp-' + type);
	}


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
	 * Using data-pdforms-messages-global on elem we could force the message to be displayed in global message placeholder.
	 */
	pdForms.addMessage = function(elem, message, type, isAjaxRuleMessage, escapeMessage) {
		var placeholder = pdForms.getMessagePlaceholder(elem);

		if (! placeholder.elem) {
			return false;
		}

		if (Object.values(pdForms.constants).indexOf(type) === -1) {
			type = pdForms.constants.MESSAGE_ERROR;
		}

		placeholder.elem.classList ?
			placeholder.elem.classList.add('pdforms-' + type) :
			placeholder.elem.className += ' pdforms-' + type;

		if (! message) {
			return false;
		}

		var tagName = placeholder.isGlobal ? 'p' : 'label';

		// global message or non-error message or first error message
		if (placeholder.isGlobal || type !== pdForms.constants.MESSAGE_ERROR || (type === pdForms.constants.MESSAGE_ERROR && ((' ' + placeholder.elem.className + ' ').indexOf(' ' + type + ' ') === -1))) {
			tagName = placeholder.elem.getAttribute('data-pdforms-messages-tagname') || tagName;
			var className = pdForms.getMessageClassName(placeholder.isGlobal, tagName, type);

			var msg = document.createElement(tagName);

			if (typeof escapeMessage === 'undefined' || escapeMessage) {
				msg.textContent = message;
			} else {
				msg.innerHTML = message;
			}

			msg.setAttribute('class', className + ' pdforms-message');
			msg.setAttribute('data-elem', elem.name);

			if (isAjaxRuleMessage) {
				msg.setAttribute('data-ajax-rule', true);
			}

			if (elem.id) {
				msg.setAttribute(tagName === 'label' ? 'for' : 'data-for', elem.id);
			}

			placeholder.elem.getAttribute('data-pdforms-messages-prepend') ?
				placeholder.elem.insertAdjacentElement('afterBegin', msg) :
				placeholder.elem.insertAdjacentElement('beforeEnd', msg);
		}
	};


	/**
	 * Removes all messages associated with input. By default removes messages associated with ajax rules as well, but that
	 * can be changed not to.
	 */
	pdForms.removeMessages = function(elem, removeAjaxRulesMessages) {
		var name = elem.name;

		// Default value should be true
		if (typeof removeAjaxRulesMessages === 'undefined') {
			removeAjaxRulesMessages = true;
		}

		// Find placeholders for input (input and global)
		var placeholder =
			elem.closest('.pdforms-messages--input') ||
			elem.closest('p');

		var globalPlaceholder = elem.form.querySelector('.pdforms-messages--global');

		// Find all messages associated with the elem
		var messages = {
			'input':  placeholder       ? Array.prototype.slice.call(placeholder.querySelectorAll('.pdforms-message'))       : [],
			'global': globalPlaceholder ? Array.prototype.slice.call(globalPlaceholder.querySelectorAll('.pdforms-message')) : []
		};
		var removeMessages = [];

		// Filter all messages for deleting
		for (var key in messages) {
			if (messages.hasOwnProperty(key)) {

				messages[key] = messages[key].filter(function(elem) {
					var isElemAssociatedMessage = elem.getAttribute('data-elem') === name;
					var isAjaxRuleMessage = elem.getAttribute('data-ajax-rule');

					// Remove ajax rules associated messages only if removeAjaxRulesMessages is true
					var shouldRemove = isElemAssociatedMessage && (removeAjaxRulesMessages || (! removeAjaxRulesMessages && ! isAjaxRuleMessage));

					if (shouldRemove) {
						removeMessages.push(elem);
					}

					return ! shouldRemove;
				});

			}
		}

		// If there is no message remaining in .pdforms-messages--input placeholder, then remove the placeholder class as well.
		if (placeholder && messages.input.length === 0) {
			for (var i in pdForms.constants) {
				var className = 'pdforms-' + pdForms.constants[i];
				placeholder.classList ?
					placeholder.classList.remove(className) :
					placeholder.className = (' ' + placeholder.className + ' ').replace(' ' + className + ' ', ' ').trim();
			}
		}

		// Remove the messages
		removeMessages.forEach(function (elem) {
			elem.remove();
		});
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
	 * Fills in the suggestion from clicked e.target into associated input element.
	 */
	pdForms.useSuggestion = function(e) {
		e.preventDefault();

		var suggestion = e.target.text;
		var elem = pdForms.getSuggestionInput(e.target);

		if (! suggestion || ! elem) {
			return false;
		}

		// clear suggestion message and validate again
		pdForms.removeMessages(elem, true);
		pdForms.setInputValue(elem, suggestion);
		pdForms.liveValidation({ target: elem });
	};


	/**
	 * For given suggestion element inside validation message finds and returns associated input element (or null).
	 */
	pdForms.getSuggestionInput = function(suggestion) {
		var msgElem = suggestion.closest('.pdforms-message');

		if (! msgElem) {
			return null;
		}

		var elemId = msgElem.getAttribute('for') || msgElem.getAttribute('data-for');

		return document.getElementById(elemId);
	}


	/**
	 * Optional rules are defined using "optional" property in "arg". We have to convert arg into Nette format before
	 * validating. This means removing all properties but data from arg and storing them elsewhere.
	 */
	Nette.validateControl = function(elem, rules, onlyCheck, value, emptyOptional) {
		elem = elem.tagName ? elem : elem[0]; // RadioNodeList

		if (! rules) {
			rules = JSON.parse(elem.getAttribute('data-nette-rules') || '[]');

			// convert arg property in rules into Nette format
			rules = pdForms.normalizeRules(rules);
		}

		// no rules -> skip element validation
		if (rules.length === 0) {
			return true;
		}

		return pdForms.validateControl(elem, rules, onlyCheck, value, emptyOptional);
	};


	/**
	 * See annotation above.
	 */
	Nette.toggleControl = function(elem, rules, success, firsttime, value) {
		// convert arg property in rules into Nette format
		rules = pdForms.normalizeRules(rules);

		pdForms.Nette.toggleControl(elem, rules, success, firsttime, value);
	};


	/**
	 * As a side effect of live validation, errors are shown directly in validateControl. This method is used only for
	 * focusing the first element with error.
	 */
	Nette.showFormErrors = function(form, errors) {
		var focusElem;

		for (var i = 0; i < errors.length; i++) {
			var elem = errors[i].element;

			if (!focusElem && elem.focus) {
				focusElem = elem;
				break;
			}
		}

		if (focusElem) {
			focusElem.focus();
		}
	};


	/**
	 * Add event listener which delegates the event to given selector.
	 */
	var addDelegatedEventListener = function(element, eventName, selector, callback) {
		var events = eventName.split(' ');

		for (var i = 0; i < events.length; i++) {
			element.addEventListener(events[i], function(e) {
				if (e.target.matches(selector)) {
					callback.call(element, e);
				}
			});
		}
	};


	/**
	 * Setting flag that input has been focused, so we won't notify about errors in fields user has not yet filled
	 */
	var setEverFocused = function(e) {
		// We only ever validate the first radio, so in case of radio, we find first radio in RadioNodeList (see the
		// reason explained in pdForms.liveValidation)
		var elem = (e.target.form[e.target.name] instanceof RadioNodeList) ? e.target.form[e.target.name].item(0) : e.target;
		var everFocused = elem.getAttribute('data-pdforms-ever-focused');

		if (everFocused) {
			return;
		}

		elem.setAttribute('data-pdforms-ever-focused', true);
	}


	/**
	 * Setup handlers.
	 */
	Nette.initForm = function (form) {
		pdForms.Nette.initForm(form);

		addDelegatedEventListener(form, 'focusout change', 'select, textarea, input:not([type="submit"]):not([type="reset"])', setEverFocused);

		addDelegatedEventListener(form, 'validate focusout',        'textarea, input:not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"])', pdForms.liveValidation);
		addDelegatedEventListener(form, 'validate focusout change', 'select', pdForms.liveValidation);
		addDelegatedEventListener(form, 'validate change',          'input[type="checkbox"], input[type="radio"], input[type="file"]', pdForms.liveValidation);

		// Suggestions from custom messages
		addDelegatedEventListener(form, 'click', '.pdforms-suggestion', pdForms.useSuggestion);

		// Validation on custom events
		var pdformsValidateOnArr = Array.prototype.slice.call(form.elements);
		pdformsValidateOnArr = pdformsValidateOnArr.filter(function(elem) {
			return elem.matches('[data-pdforms-validate-on]');
		});

		for (var i = 0; i < pdformsValidateOnArr.length; i++) {
			(function() {
				var el = pdformsValidateOnArr[i];
				var eventName = el.getAttribute('data-pdforms-validate-on');

				form.addEventListener(eventName, function(e) {
					if (e.target === el) {
						setEverFocused(e);

						pdForms.liveValidation.call(form, e);
					}
				})
			})();
		}
	};


	return pdForms;
}));
