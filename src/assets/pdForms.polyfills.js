/**
 * @name pdForms.polyfills
 * @author Radek Šerý <radek.sery@peckadesign.cz>
 *
 * Polyfills required for support in IE9+.
 */
(function() {

	if (! Element.prototype.matches) {
		Element.prototype.matches =
			Element.prototype.msMatchesSelector ||
			Element.prototype.webkitMatchesSelector;
	}


	if (! Element.prototype.closest) {
		Element.prototype.closest = function(s) {
			var el = this;

			do {
				if (el.matches(s)) {
					return el;
				}
				el = el.parentElement || el.parentNode;
			} while (el !== null && el.nodeType === 1);

			return null;
		};
	}


	if (! Object.values) {
		Object.values = function (obj) {
			return Object.keys(obj).map(function(i) {
				return obj[i];
			});
		}
	}

})();
