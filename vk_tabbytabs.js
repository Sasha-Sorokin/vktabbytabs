// ==UserScript==
// @name VK Tabby Tabs
// @name:ru VK Tabby Tabs
// @description Moves feed tabs from menu on right side to the top of center column
// @description:ru Перемещает вкладки из меню справа на самый верх колонки новостей
// @version 1.0.0
// @author Sasha_Sorokin
// @namespace https://github.com/Sasha-Sorokin/vktabbytabs
// @supportURL https://github.com/Sasha-Sorokin/vktabbytabs/issues
// @updateURL https://github.com/Sasha-Sorokin/vktabbytabs/raw/master/vklistadd.user.js
// @run-at document-start
// @include https://vk.com/*
// @noframes
// @grant unsafeWindow
// @grant GM.setValue
// @grant GM_setValue
// @grant GM.getValue
// @grant GM_getValue
// ==/UserScript==

(function vkTabbyTabs() {
	console.log("[TABBY TABS] Initializing...");

	// Anti-linter: objects defined for linter not to complain and easier access

	// eslint-disable-next-line dot-notation
	const WINDOW = window["unsafeWindow"];

	// Regexp to match associated section name

	const SECTION_CLASS_REGEXP = /feed_section_([a-z0-9]+)/;

	const HIDE_CLASS_NAME = "tabbytabs_hidden";

	// Symbols for tab mappings

	const $ID_LISTS_MENU = Symbol("listsMenu");
	const $ID_MORE_GROUP = Symbol("moreGroup");

	// Global Configurations

	/**
	 * Collection of methods to work with GM objects
	 */
	const USERSCRIPT = (function userscriptScope() {
		const $USERSCRIPT_INFO = Symbol("info");
		const $USERSCRIPT_GET_VALUE = Symbol("getValue");
		const $USERSCRIPT_SET_VALUE = Symbol("setValue");
		const $USERSCRIPT_LOCALSTORAGE_FUNCTIONS = Symbol("localStorageFunctions");
		const $USERSCRIPT_LOCALSTORAGE_KEYGEN = Symbol("generateLocalStoreKey");
		const $USERSCRIPT_NONE = Symbol("none");

		const userscript = {
			isAvailable: false,

			/**
			 * Generates "unique" key for the local storage so it
			 * does not mix up with current localStorage items
			 *
			 * @param {string} key Key itself
			 * @returns {string} Generated "uniqueKey"
			 */
			[$USERSCRIPT_LOCALSTORAGE_KEYGEN](key) {
				return `GM!!TABBY_TABS!!${key}`;
			},

			[$USERSCRIPT_LOCALSTORAGE_FUNCTIONS]: {
				/**
				 * Gets key's value from the localStorage
				 *
				 * @param {string} key Key itself
				 * @returns {string | null} Stored string value or `null` if nothing found
				 */
				getLocalStoreItem(key) {
					key = USERSCRIPT[$USERSCRIPT_LOCALSTORAGE_KEYGEN](key);

					return localStorage.getItem(key);
				},

				/**
				 * Sets key's value in the localStore
				 *
				 * @param {string} key Key itself
				 * @param {*} value Any value which will be converted to string
				 */
				setLocalStoreItem(key, value) {
					key = USERSCRIPT[$USERSCRIPT_LOCALSTORAGE_KEYGEN](key);

					localStorage.setItem(key, value);
				},
			},

			/**
			 * Gets GM object function replacement by its name as workaround
			 *
			 * @param {string} funcName Function name
			 * @returns {Function | null} Replacement if available, otherwise `null`
			 */
			getGMFunctionReplacement(funcName) {
				switch (funcName) {
					case "setValue": {
						return this[$USERSCRIPT_LOCALSTORAGE_FUNCTIONS].setLocalStoreItem;
					}
					case "getValue": {
						return this[$USERSCRIPT_LOCALSTORAGE_FUNCTIONS].getLocalStoreItem;
					}
					default: return null;
				}
			},

			/**
			 * Gets GM object function or its replacement (if available)
			 *
			 * @param {string} funcName Name of the function in GM object
			 * @returns {Function} GM object function or its replacement
			 * @throws {Error} Whenever there is no such function and no replacement available
			 */
			getGMFunction(funcName) {
				let func;

				// eslint-disable-next-line dot-notation
				const greasemonkey = window["GM"];

				func = greasemonkey && greasemonkey[funcName];

				if (func == null) {
					func = window[`GM_${funcName}`];

					const alternative = this.getGMFunctionReplacement(funcName);

					if (!alternative) {
						throw new Error(`Userscript manager does not support function "${funcName}" or permission to it was not granted, and there's no replacement for it.`);
					}
				}

				return func;
			},

			[$USERSCRIPT_INFO]: null,

			/**
			 * @typedef UserScriptResource
			 * @property {string} name Name of the resource
			 * @property {string} mimetype Mime type of the resource
			 * @property {string} url URI of the resource
			 */

			/**
			 * @typedef UserScriptInfo
			 * @property {string} [name] Name of the userscipt
			 * @property {string} [icon] Icon of the userscript
			 * @property {string} [icon64] Icon of the userscript (64x64)
			 * @property {string} [description] Description of the userscript
			 * @property {string} [namespace] Namespace of the userscript
			 * @property {string} [author] Author of the userscript
			 * @property {string} [homepage] Homepage of the userscript
			 * @property {Array<string>} excludes Excluded sites from script to work
			 * @property {Array<string>} includes Included sites for script to work
			 * @property {Array<string>} matches Mathching sites where script is working
			 * @property {Object.<string, UserScriptResource>} resources Userscript resources
			 * @property {string} run-at When userscript runs
			 * @property {string} [version] Version of the userscipt
			 * @property {number} [lastUpdated] Last timestamp of userscript updated
			 */

			/**
			 * @typedef GMInfo
			 * @property {UserScriptInfo} script Object containing data about the running script
			 * @property {string} scriptMetaStr Entire literal Metadata Block of the script
			 * @property {string} scriptHandler Name of userscript engine handling execution
			 * @property {string} version Version of the userscript engine
			 * @see https://www.tampermonkey.net/documentation.php#GM_info For Tampermonkey
			 * @see https://wiki.greasespot.net/GM.info For Greasymonkey
			 */

			/**
			 * If available, gets information about the userscript manager and userscipt itself
			 *
			 * @returns {GMInfo} Object exposing various information about engine and the script
			 */
			getInfo() {
				return this[$USERSCRIPT_INFO];
			},

			[$USERSCRIPT_GET_VALUE]: null,

			[$USERSCRIPT_SET_VALUE]: null,

			/**
			 * Gets value from the userscript's store
			 *
			 * @param {string} key Key under which value is stored
			 * @param {*} [strictType] Expected type of value: boolean, number, or null if any acceptable
			 * @param {*} [defaultValue] Default value if no value found
			 * @async
			 * @returns {Promise<*>} Literally anything from nothing to what you needed
			 */
			async getSetting(key, strictType, defaultValue = $USERSCRIPT_NONE) {
				const value = await this[$USERSCRIPT_GET_VALUE](key);

				if (value == null && defaultValue !== $USERSCRIPT_NONE) {
					return defaultValue;
				}

				switch (strictType) {
					case "boolean": {
						if (typeof value === "boolean") return value;

						switch (value) {
							case "true": return true;
							case "false": return false;
							default: {
								if (defaultValue !== $USERSCRIPT_NONE) {
									return defaultValue;
								}

								return null;
							}
						}
					}
					case "number": {
						if (typeof value === "number") return value;

						if (value === "NaN") return NaN;

						const val = +value;

						if (!Number.isNaN(val)) return val;

						if (defaultValue !== $USERSCRIPT_NONE) return defaultValue;

						return null;
					}
					default: return value;
				}
			},

			/**
			 * Stores setting value in the
			 *
			 * @param {string} key Key under which value will be stored
			 * @param {*} value Value to store
			 * @async
			 */
			async setSetting(key, value) {
				await this[$USERSCRIPT_SET_VALUE](key, value);
			},
		};

		try {
			userscript[$USERSCRIPT_INFO] = userscript.getGMFunction("info");
		} catch {
			userscript[$USERSCRIPT_INFO] = undefined;
		}

		userscript[$USERSCRIPT_GET_VALUE] = userscript.getGMFunction("getValue");
		userscript[$USERSCRIPT_SET_VALUE] = userscript.getGMFunction("setValue");

		return userscript;
	})();

	// -------------------------

	(function printDiagosticsInfo() {
		const info = USERSCRIPT.getInfo();

		if (!info) {
			console.warn("[TABBY TABS] Unable to get diagnostics info :(");

			return;
		}

		console.info(`[TABBY TABS] Tabby Tabs v${info.script.version}`);
		console.info(`[TABBY TABS] Working on ${info.scriptHandler} ${info.version}`);
		console.info(`[TABBY TABS] Last updated at ${new Date(info.script.lastUpdated).toUTCString()}`);
	})();

	// -------------------------

	const WRAPPING = (function wrappingScope() {
		const $WRAPPING_IS_WRAPPED = Symbol("isWrapped");

		const wrapping = {
			/**
			 * Defines a window property and whenever it changed, calls `postChange` function
			 *
			 * @param {string} property Name of the property in "window" object
			 * @param {function(*):void} postChange Function to call after value of property is changed
			 */
			wrapProperty(property, postChange) {
				let current = WINDOW[property];

				Object.defineProperty(WINDOW, property, {
					get() {
						return current;
					},
					set(val) {
						current = val;

						postChange(val);
					},
				});
			},

			/**
			 * Wraps function and returns a new one, which can safely replace original one
			 *
			 * @param {Function} originalFunction Original function to wrap
			 * @param {function(*)} laterFunction Function to call after original function
			 * @param {Function} [preFunction] Function to call before original function
			 * @returns {Function} Wrapped function
			 */
			wrapFunction(originalFunction, laterFunction, preFunction) {
				/**
				 * Wrapped function which first safely calls pre-function with arguments
				 * and then calls later function after original function is called with
				 * result returned from pre-function
				 *
				 * @param  {...any} args Arguments function called with
				 */
				function wrapped(...args) {
					let preSucceed = true;
					let preResult;

					if (preFunction) {
						try {
							preResult = preFunction(...args);
						} catch (err) {
							console.error(`[TABBY TABS] Failed to call preFunction() in wrapper for ${originalFunction.name}()`, err);

							preSucceed = false;
						}
					}

					originalFunction(...args);

					if (preSucceed) {
						try {
							laterFunction(preResult);
						} catch (err) {
							console.error(`[TABBY TABS] Failed to call laterFunction() in wrapper for ${originalFunction.name}():`, err);
						}
					} else {
						console.warn("[TABBY TABS] preFunction() did not succeed, laterFunction() is not going to be called");
					}
				}

				wrapped[$WRAPPING_IS_WRAPPED] = true;

				return wrapped;
			},

			/**
			 * Checks if function is already a wrapper created using `wrapFunction`
			 *
			 * @param {Function} func Function to check
			 * @returns {boolean} Is function wrapped
			 */
			isWrapped(func) {
				const signature = func[$WRAPPING_IS_WRAPPED];

				return signature != null && signature;
			},
		};

		return wrapping;
	})();

	const L10N = (function l10nScope() {
		const $L10N_STRINGS = Symbol("l10nStrings");

		const $L10N_LOCALE_IMPERIAL = Symbol("l10nLocaleImperial");
		const $L10N_LOCALE_SOVIET = Symbol("l10nLocaleSoviet");
		const $L10N_LOCALE_RUSSIAN = Symbol("l10LocaleRussian");
		const $L10N_LOCALE_BELARUSIAN = Symbol("l10nLocaleBelarusian");
		const $L10N_LOCALE_UKRAINIAN = Symbol("l10nLocaleUkrainian");
		const $L10N_LOCALE_ENGLISH = Symbol("l10nEnglish");

		const $L10N_RELATIVES = Symbol("l10nRelativeLocales");
		const $L10N_IDS_MAPPING = Symbol("l10nIdsMapping");

		const $L10N_CURRENT_WALK_MAP = Symbol("l10nCurrentLocale");

		/**
		 * Collection of methods related to localization
		 */
		const l10n = {
			/**
			 * IDs mappings to locales
			 */
			[$L10N_IDS_MAPPING]: {
				// Russian
				0: $L10N_LOCALE_RUSSIAN,
				100: $L10N_LOCALE_IMPERIAL,
				777: $L10N_LOCALE_SOVIET,
				// Belarusian
				114: $L10N_LOCALE_BELARUSIAN,
				2: $L10N_LOCALE_BELARUSIAN,
				// Ukrainian
				1: $L10N_LOCALE_UKRAINIAN,
				454: $L10N_LOCALE_UKRAINIAN,
				452: $L10N_LOCALE_UKRAINIAN,
				// English
				3: $L10N_LOCALE_ENGLISH,
			},

			/**
			 * Map of relative languages
			 */
			[$L10N_RELATIVES]: {
				[$L10N_LOCALE_IMPERIAL]: [$L10N_LOCALE_RUSSIAN],
				[$L10N_LOCALE_SOVIET]: [$L10N_LOCALE_RUSSIAN],
				[$L10N_LOCALE_UKRAINIAN]: [$L10N_LOCALE_RUSSIAN],
				[$L10N_LOCALE_BELARUSIAN]: [$L10N_LOCALE_RUSSIAN],
				// Any other will fall back to English
			},

			/**
			 * Map of strings
			 */
			[$L10N_STRINGS]: {
				/**
				 * Name of the button to edit the list shown right after "News" tab
				 */
				newsFilterButtonName: {
					[$L10N_LOCALE_IMPERIAL]: "Измѣнить списокъ",
					[$L10N_LOCALE_SOVIET]: "Настроить выборку",
					[$L10N_LOCALE_RUSSIAN]: "Настроить список",
					[$L10N_LOCALE_ENGLISH]: "Edit list",
				},
				/**
				 * ARIA Label for list button in tabs settings menu
				 */
				editListButtonLabel: {
					[$L10N_LOCALE_IMPERIAL]: "Измѣнить списокъ «{listName}»",
					[$L10N_LOCALE_SOVIET]: "Настроить выборку «{listName}»",
					[$L10N_LOCALE_RUSSIAN]: "Настроить список «{listName}»",
					[$L10N_LOCALE_ENGLISH]: "Edit list “{listName}”",
				},
				/**
				 * ARIA Label for button to remove tab in settings menu
				 */
				removeListButtonLabel: {
					[$L10N_LOCALE_IMPERIAL]: "Сжечь списокъ «{listName}»",
					[$L10N_LOCALE_SOVIET]: "Убрать выборку «{listName}»",
					[$L10N_LOCALE_RUSSIAN]: "Удалить вкладку «{listName}»",
					[$L10N_LOCALE_ENGLISH]: "Delete list “{listName}”",
				},
				/**
				 * Name of the "New post" block
				 *
				 * Shown in lists action menu and used to toggle block's display state
				 */
				postBlockName: {
					[$L10N_LOCALE_IMPERIAL]: "Размѣстить высказыванiе",
					[$L10N_LOCALE_SOVIET]: "Поднять тему",
					[$L10N_LOCALE_RUSSIAN]: "Опубликовать запись",
					[$L10N_LOCALE_BELARUSIAN]: "Апублікаваць запіс",
					[$L10N_LOCALE_UKRAINIAN]: "Опублікувати запис",
					[$L10N_LOCALE_ENGLISH]: "Publish post",
				},
				/**
				 * Name of the "Stories" block
				 *
				 * Shown in lists action menu and used to toggle block's display state
				 */
				storiesBlockName: {
					[$L10N_LOCALE_IMPERIAL]: "Авантюры",
					[$L10N_LOCALE_SOVIET]: "Хроники товарищей",
					[$L10N_LOCALE_RUSSIAN]: "Истории",
					[$L10N_LOCALE_BELARUSIAN]: "Гісторыі",
					[$L10N_LOCALE_UKRAINIAN]: "Історії",
					[$L10N_LOCALE_ENGLISH]: "Stories",
				},
				/**
				 * Label shown on "More" group which holds some tabs that did not fit in main list
				 */
				moreGroupLabel: {
					[$L10N_LOCALE_IMPERIAL]: "Еще",
					[$L10N_LOCALE_RUSSIAN]: "Ещё",
					[$L10N_LOCALE_BELARUSIAN]: "Яшчэ",
					[$L10N_LOCALE_UKRAINIAN]: "Ще",
					[$L10N_LOCALE_ENGLISH]: "More",
				},
				/**
				 * Label shown on "Stories" toggle alerting that VkOpt Extensios manages the setting
				 */
				vkOptManagedLabel: {
					[$L10N_LOCALE_RUSSIAN]: "Настройка управляется VkOpt",
					[$L10N_LOCALE_ENGLISH]: "Setting is managed by VkOpt",
				},
				/**
				 * Label for the screenreader-only checkbox used to display secret tabs
				 */
				secretTabsLabel: {
					[$L10N_LOCALE_RUSSIAN]: "Скрытые вкладки",
					[$L10N_LOCALE_ENGLISH]: "Secret Tabs",
				},
			},

			/**
			 * Current locale used
			 *
			 * @type {Array<symbol> | null}
			 */
			[$L10N_CURRENT_WALK_MAP]: null,

			/**
			 * Gets value of the string
			 *
			 * @param {string} key Key of the string
			 * @param {Object.<string,string>} [placeholders] Placeholder
			 * @returns {string} Value by key
			 * @throws {Error} If key is not found or there are no fallback locales
			 */
			getString(key, placeholders) {
				const walkMap = this[$L10N_CURRENT_WALK_MAP];
				const strings = this[$L10N_STRINGS];

				const walkArea = strings[key];

				if (!walkArea) throw new Error(`String "${key}" not found.`);

				for (const locale of walkMap) {
					let value = walkArea[/** @type {any} */ (locale)];

					if (!value) continue;

					if (placeholders != null) {
						for (const placeholder of Object.keys(placeholders)) {
							value = value.replace(`{${placeholder}}`, placeholders[placeholder]);
						}
					}

					return value;
				}

				throw new Error("Unable to get value by this key with current walking map of locales.");
			},
		};

		/**
		 * Detect and configure language based on new page language configuration
		 *
		 * @param {*} langConfig Page language config
		 */
		function detectLanguage(langConfig) {
			const walkMap = [];

			const mapped = l10n[$L10N_IDS_MAPPING][langConfig.id];

			if (mapped != null) {
				walkMap.push(mapped);

				const relatives = l10n[$L10N_RELATIVES][mapped];

				if (relatives) walkMap.push(...relatives);
			}

			if (!walkMap.includes($L10N_LOCALE_ENGLISH)) {
				walkMap.push($L10N_LOCALE_ENGLISH);
			}

			l10n[$L10N_CURRENT_WALK_MAP] = walkMap;
		}

		WRAPPING.wrapProperty("langConfig", detectLanguage);

		return l10n;
	})();

	/**
	 * Collection of the DOM related stuff
	 */
	const DOM = {
		/**
		 * Inserts element before referenced node
		 *
		 * @param {HTMLElement} referenceNode Reference node
		 * @param {HTMLElement} newNode New node to insert before reference node
		 */
		insertBefore(referenceNode, newNode) {
			referenceNode.parentNode.insertBefore(newNode, referenceNode);
		},

		/**
		 * Adds event listeners to element
		 *
		 * @param {HTMLElement} element Element to add event listeners to
		 * @param {*} eventListeners Object of event listeners assigned to event name
		 */
		addEventListeners(element, eventListeners) {
			for (const eventName of Object.keys(eventListeners)) {
				element.addEventListener(eventName, eventListeners[eventName]);
			}
		},

		/**
		 * Assigns styles to element
		 *
		 * @param {HTMLElement} element Element to assign styles to
		 * @param {Object.<string, string>} styles Styles to assign
		 * @returns {HTMLElement} Element itself but with a little of fashion
		 */
		assignStyles(element, styles) {
			Object.assign(element.style, styles);

			return element;
		},

		/**
		 * Assigns attributes to element
		 *
		 * @param {HTMLElement} element Element to assign attributes to
		 * @param {*} attributes Object of attributes assigned to their names
		 */
		assignAttributes(element, attributes) {
			for (const attribute of Object.keys(attributes)) {
				element.setAttribute(attribute, attributes[attribute]);
			}
		},

		/**
		 * Assigns dataset values to element
		 *
		 * @param {HTMLElement} element Element to assing dataset values to
		 * @param {Object.<string, string | number>} values Object of dataset values
		 * assingned to their names
		 * @returns {HTMLElement} Element itself but now with data
		 */
		assingDataValues(element, values) {
			Object.assign(element.dataset, values);

			return element;
		},

		/**
		 * @typedef ElementCreationOptions
		 * @property {object} [props] Properties to assign
		 * @property {Object.<string, string>} [style] Styles to assign
		 * @property {Object.<string, function>} [events] Event listeners to add
		 * @property {Object.<string, string>} [attributes] Attributes to assign
		 * @property {Object.<string, *>} [dataset] Dataset values to assign
		 * @property {Element} [mount] Element where newly created element will be appended
		 * @property {Element} [child] Child element to append to newly created element
		 * @property {Element[]} [children] Child elements to append to newly created element
		 */

		/**
		 * Creates new element and mounts it if chosen
		 *
		 * @param {string} tagName New element tag name
		 * @param {ElementCreationOptions} options Options of the object
		 * @returns {HTMLElement} New element
		 */
		createElement(tagName, options) {
			const {
				props,
				style,
				events,
				attributes,
				dataset,
				mount,
				child,
				children,
			} = options;

			const el = document.createElement(tagName);

			if (props != null) Object.assign(el, props);
			if (attributes != null) DOM.assignAttributes(el, attributes);
			if (dataset != null) DOM.assingDataValues(el, dataset);
			if (style != null) DOM.assignStyles(el, style);
			if (events != null) DOM.addEventListeners(el, events);
			if (mount instanceof HTMLElement) mount.appendChild(el);

			if (child != null) el.appendChild(child);
			if (children != null) DOM.appendEvery(children, el);

			return el;
		},

		/**
		 * Appends all elements in the array to the parent
		 *
		 * @param {Element[]} elements Elements to append
		 * @param {HTMLElement} parent Parent to append elements to
		 */
		appendEvery(elements, parent) {
			for (const element of elements) parent.appendChild(element);
		},
	};

	const STYLES = (function stylesScope() {
		const $STYLES_INITIALIZED_MAP = Symbol("initializedStylesMap");
		const $STYLES_ELEMENT = Symbol("stylesElement");

		/**
		 * Collection of methods related to styling
		 */
		const styles = {
			/**
			 * Current styles element
			 */
			[$STYLES_ELEMENT]: null,

			/**
			 * Gets or creates new styles element
			 *
			 * @returns {HTMLStyleElement} Style element
			 */
			getStyleElement() {
				let styleElement = this[$STYLES_ELEMENT];

				if (!styleElement) {
					styleElement = DOM.createElement("style", {
						props: {
							id: "tabbytabs_styles",
							type: "text/css",
						},
					});

					this[$STYLES_ELEMENT] = styleElement;

					document.head.appendChild(styleElement);
				}

				return styleElement;
			},

			/**
			 * Gets map of initialized styles with indexes assigned to IDs
			 *
			 * @param {HTMLStyleElement} styleElement Style element
			 * @returns {Object.<string, Array.<number> | undefined>} Map of initialized styles
			 */
			getInitializedMap(styleElement) {
				let initializedStylesMap = styleElement[$STYLES_INITIALIZED_MAP];

				if (!initializedStylesMap) {
					initializedStylesMap = Object.create(null);

					styleElement[$STYLES_INITIALIZED_MAP] = initializedStylesMap;
				}

				return initializedStylesMap;
			},

			/**
			 * Gets editable sheet from style element
			 *
			 * @param {HTMLStyleElement} styleElement Style element
			 * @returns {CSSStyleSheet} CSS Style Sheet
			 */
			getSheet(styleElement) {
				return /** @type {CSSStyleSheet} */ (styleElement.sheet);
			},

			/**
			 * Adds style to the script's own stylesheet
			 *
			 * One style per chunk is allowed, otherwise error
			 * will be thrown by insertRule function
			 *
			 * @param {string} id ID of the CSS style
			 * @param {Array<string>} chunks Chunks of styles
			 * @returns {boolean} Whether the style was added
			 */
			addStyle(id, ...chunks) {
				const styleElement = this.getStyleElement();

				const initializedStylesMap = this.getInitializedMap(styleElement);

				if (initializedStylesMap[id]) return false;

				const styleSheet = this.getSheet(styleElement);

				const ids = [];

				initializedStylesMap[id] = ids;

				for (const style of chunks) {
					ids.push(styleSheet.insertRule(style));
				}

				return true;
			},

			/**
			 * Removes style from the script's stylesheet
			 *
			 * @param {string} id ID of the CSS style
			 * @returns {boolean} Whether the style was removed
			 */
			removeStyle(id) {
				const styleElement = this.getStyleElement();

				const initializedStylesMap = this.getInitializedMap(styleElement);

				const indexes = initializedStylesMap[id];

				if (indexes == null) return false;

				const styleSheet = this.getSheet(styleElement);

				for (const index of indexes) {
					styleSheet.deleteRule(index);
				}

				initializedStylesMap[id] = undefined;

				return true;
			},
		};

		return styles;
	})();

	/**
	 * Collection of helpful methods in the code
	 */
	const UTIL = (function helpersScope() {
		const $HELPERS_HAS_OWN_PROPERTY = Symbol("hasOwnProperty");
		const $HELPERS_SLICE = Symbol("slice");

		const util = {
			/**
			 * @alias Array.prototype.slice
			 * @private This method is stored for faster access
			 */
			[$HELPERS_SLICE]: Array.prototype.slice,

			/**
			 * Converts object to array using old fashioned method of
			 * calling `Array.prototype.slice` which is several times
			 * faster than `Array.from`, but converts less structures
			 *
			 * @param {*} obj Object to convert to array
			 * @returns {*[]} Converted array
			 */
			toArray(obj) {
				return this[$HELPERS_SLICE].call(obj);
			},

			/**
			 * @alias Object.prototype.hasOwnProperty
			 * @private This method is stored for faster access
			 */
			[$HELPERS_HAS_OWN_PROPERTY]: Object.prototype.hasOwnProperty,

			/**
			 * Callback for iteration in {@link HELPERS#forEach}
			 *
			 * @callback IterationCallback
			 * @param {*} value Value of current iteration
			 * @param {string} index Current index in array or object
			 * @param {(object|any[])} elements Current array or object
			 * @param {function():void} breakAfter Function to break iteration
			 */

			/**
			 * Iterates over array or object properties and calls callback function
			 *
			 * @param {(object|any[])} elements Object or array to iterate over
			 * @param {IterationCallback} callback Iteration callback
			 */
			forEach(elements, callback) {
				if (!callback) return;

				let mustBreak = false;

				const breakAfter = () => {
					mustBreak = true;
				};

				const hasOwnProperty = this[$HELPERS_HAS_OWN_PROPERTY];

				// eslint-disable-next-line no-restricted-syntax
				for (const key in elements) {
					if (!hasOwnProperty.call(elements, key)) continue;

					callback(elements[key], key, elements, breakAfter);

					if (mustBreak) break;
				}
			},

			/**
			 * Checks whether node is child of `referenceNode`
			 *
			 * @param {Node} node Expected child of `referenceNode`
			 * @param {Node} referenceNode Expected parent node of `node`
			 * @returns {boolean} Whether the node is not child of `referenceNode`
			 */
			isChildOf(node, referenceNode) {
				return node.parentNode === referenceNode;
			},

			/**
			 * Appends `node` to `referenceNode` but avoids doing this
			 * if `node` is already child of `referenceNode`. Useful if
			 * you **don't** want to re-position child element to the end
			 *
			 * @param {Node} node Node to append
			 * @param {Node} referenceNode Parent node to append
			 * @returns {boolean} Whether the element was re-mounted
			 */
			appendIfNotChild(node, referenceNode) {
				if (this.isChildOf(node, referenceNode)) return false;

				referenceNode.appendChild(node);

				return true;
			},

			/**
			 * Runs sequence on specific target
			 *
			 * @param {*} target Target of sequence
			 * @param {Array<function(*)>} sequence Sequence to run
			 */
			runSequenceOn(target, sequence) {
				// eslint-disable-next-line no-plusplus
				for (let i = 0, l = sequence.length; i < l; i++) {
					const sequenceElem = sequence[i];

					if (sequenceElem == null) {
						console.trace(`[TABBY TABS] Element at index ${i} is ${sequenceElem} in sequence`, sequence);

						throw new Error(`Sequence element at position ${i} is either null or undefined.`);
					}

					sequenceElem(target);
				}
			},

			/**
			 * Hides or shows element using the hidding class and aria attributes
			 *
			 * @param {HTMLElement} element Element to hide or show
			 * @param {boolean} isHidden Whether element is hidden or not
			 */
			toggleHide(element, isHidden) {
				element.classList.toggle(HIDE_CLASS_NAME, isHidden);

				DOM.assignAttributes(element, {
					"aria-hidden": `${isHidden}`,
				});
			},

			/**
			 * Checks whether element is hidden or not
			 *
			 * @param {HTMLElement} element Element to check if hidden
			 * @returns {boolean} Whether element is hidden
			 */
			isHidden(element) {
				let computedStyle;

				// eslint-disable-next-line no-return-assign
				return element.classList.contains(HIDE_CLASS_NAME)
					|| (computedStyle = getComputedStyle(element)).display === "none"
					|| computedStyle.visibility === "hidden";
			},
		};

		return util;
	})();

	/**
	 * Collection of methods related to interactive state changes
	 */
	const CHOREOGRAPHER = (function choreographerScope() {
		const $CHOREOGRAPHER_ACTIVE_CANCEL = Symbol("choreographerActive");

		const $CHOREOGRAPHER_TOGGLE_COLLAPSE = Symbol("toggleCollapse");

		return {
			/**
			 * @typedef {Object.<string, number | string>} ChoreographerAnimation
			 */

			/**
			 * @typedef ChoreographerCollapseOptions
			 * @property {HTMLElement} element Element to collapse or expand
			 * @property {boolean} state Whether element must be collapsed
			 * @property {boolean} horizontal Whether element collapsed horizontally
			 * @property {Function} onComplete Function to call whenever collapse or expansion complete
			 * @property {Function} onCancel Function to call whenever animation is cancelled
			 * @property {number} [duration] Duration of collapsing animation in milliseconds
			 * @property {boolean} [forceHideOverflow] Forces hidding of the overflow
			 */

			/**
			 * Collapses or expands element according to provided state
			 *
			 * @param {ChoreographerCollapseOptions} options Properties for toggle
			 */
			[$CHOREOGRAPHER_TOGGLE_COLLAPSE](options) {
				const {
					element,
					state,
					horizontal,
					onComplete,
					onCancel,
					duration,
					forceHideOverflow,
				} = options;

				if (element[$CHOREOGRAPHER_ACTIVE_CANCEL]) {
					element[$CHOREOGRAPHER_ACTIVE_CANCEL]();
				}

				element[$CHOREOGRAPHER_ACTIVE_CANCEL] = onCancel;

				// Element can be hidden with style override, typically by
				// calling hide() VK function, in this case we should not
				// do anything related to animations and just reset our styles
				const isStyleChanged = element.style.display !== "block"
					&& element.style.display.length > 0;

				const properties = horizontal ? {
					primary: "width",
					margins: [
						{ property: "marginLeft", css: "margin-left" },
						{ property: "marginRight", css: "margin-right" },
					],
					paddings: [
						{ property: "paddingLeft", css: "padding-left" },
						{ property: "paddingRight", css: "padding-right" },
					],
				} : {
					primary: "height",
					margins: [
						{ property: "marginTop", css: "margin-top" },
						{ property: "marginBottom", css: "margin-bottom" },
					],
					paddings: [
						{ property: "paddingTop", css: "padding-top" },
						{ property: "paddingBottom", css: "padding-bottom" },
					],
				};

				const firstMargin = properties.margins[0];
				const secondMargin = properties.margins[1];

				const firstPadding = properties.paddings[0];
				const secondPadding = properties.paddings[1];

				if (forceHideOverflow) element.style.overflow = "hidden";

				if (state) {
					if (isStyleChanged) {
						UTIL.toggleHide(element, true);

						onComplete();

						return;
					}

					const animation = /** @type {ChoreographerAnimation} */({
						opacity: 0,
						[properties.primary]: 0,
						[firstMargin.css]: 0,
						[secondMargin.css]: 0,
						[firstPadding.css]: 0,
						[secondPadding.css]: 0,
					});

					if (forceHideOverflow) animation.overflow = "hidden";

					const animationOptions = {
						duration,
						onComplete: () => {
							// Some children elements can show up after we
							// squash its parent, so we must hide them away
							element.style.visibility = "hidden";

							UTIL.toggleHide(element, true);

							onComplete();
						},
					};

					WINDOW.animate(element, animation, animationOptions);
				} else {
					UTIL.toggleHide(element, false);

					DOM.assignStyles(element, {
						visibility: "",
						opacity: "",
						[properties.primary]: "",
						[firstMargin.property]: "",
						[secondMargin.property]: "",
						[firstPadding.property]: "",
						[secondPadding.property]: "",
					});

					if (isStyleChanged) {
						onComplete();

						return;
					}

					const computedStyle = getComputedStyle(element);

					const targetValues = {
						primary: computedStyle[properties.primary],
						firstMargin: computedStyle[firstMargin.property],
						secondMargin: computedStyle[secondMargin.property],
						firstPadding: computedStyle[firstPadding.property],
						secondPadding: computedStyle[secondPadding.property],
					};

					const anyAuto = targetValues.primary === "auto"
						|| targetValues.firstMargin === "auto"
						|| targetValues.secondMargin === "auto";

					if (anyAuto) return;

					DOM.assignStyles(element, {
						opacity: "0",
						[properties.primary]: "0",
						[firstMargin.property]: "0",
						[secondMargin.property]: "0",
						[firstPadding.property]: "0",
						[secondPadding.property]: "0",
					});

					const animation = /** @type {ChoreographerAnimation} */({
						opacity: 1,
						[properties.primary]: +(targetValues.primary.slice(0, -2)),
						[firstMargin.css]: +(targetValues.firstMargin.slice(0, -2)),
						[secondMargin.css]: +(targetValues.secondMargin.slice(0, -2)),
						[firstPadding.css]: +(targetValues.firstPadding.slice(0, -2)),
						[secondPadding.css]: +(targetValues.secondPadding.slice(0, -2)),
					});

					if (forceHideOverflow) animation.overflow = "hidden";

					const animationOptions = {
						duration,
						onComplete: () => {
							element.style.height = "";

							onComplete();
						},
					};

					WINDOW.animate(element, animation, animationOptions);
				}
			},

			/**
			 * Collapses or expands element based on its state, then
			 * adds or removes class that effectively hides this element
			 *
			 * @param {HTMLElement} element Element to collapse or expand
			 * @param {boolean} state Whether the element is collapsed
			 * @param {boolean} [horizontal] Whether the element must be collapsed horizontally
			 * @param {number} [duration] Duration of collapsing animation in milliseconds
			 * @param {boolean} [forceHideOverflow] Force overflow hidding
			 * @returns {Promise} Promise which resolved after collapse or expansion is complete
			 * @async
			 */
			toggleCollapse(element, state, horizontal = false, duration, forceHideOverflow) {
				const collapseFunction = this[$CHOREOGRAPHER_TOGGLE_COLLAPSE];

				return new Promise(
					(resolve, reject) => collapseFunction({
						element,
						state,
						horizontal,
						onComplete: resolve,
						onCancel: reject,
						duration,
						forceHideOverflow,
					}),
				);
			},
		};
	})();

	/**
	 * @typedef TabProperties
	 * @property {string} url URL where tabs redirecting
	 * @property {boolean} isHidden Is this tab hidden
	 * @property {boolean} isSelected Is this tab selected
	 * @property {HTMLCollection | Array<Element>} children Children to append
	 */

	const $TABS_WRAP_TAB = Symbol("tabWrap");
	const $TABS_WRAP_GROUP_ITEM = Symbol("groupItemWrap");

	const $TABS_GROUP_TAB_ITEMS = Symbol("groupItemsElement");
	const $TABS_GROUP_TAB_LABEL = Symbol("groupLabelElement");

	/**
	 * Collection of methods related to tabs list element
	 */
	const TABS_LIST = (function tabsListScope() {
		const $TABS_LIST_TABS = Symbol("tabs");
		const $TABS_LIST_MAP = Symbol("sectionsMap");
		const $TABS_LIST_FORCED = Symbol("currentSelection");

		return {
			/**
			 * Creates list where tabs can be located
			 *
			 * @returns {HTMLUListElement} Tabs list
			 */
			createTabsList() {
				const tabsList = DOM.createElement("ul", {
					props: { className: "ui_tabs clear_fix" },
					attributes: { role: "menu" },
				});

				tabsList[$TABS_LIST_TABS] = new Set();
				tabsList[$TABS_LIST_MAP] = Object.create(null);
				tabsList[$TABS_LIST_FORCED] = new Set();

				WINDOW.uiTabs.tryInit(tabsList);

				return /** @type {HTMLUListElement} */ (tabsList);
			},

			/**
			 * Wraps tabs list into the page block
			 *
			 * @param {HTMLUListElement} tabsList Tabs block
			 * @returns {HTMLDivElement} Page block ready for insertion
			 */
			wrapTabsList(tabsList) {
				const wrapper = DOM.createElement("div", {
					props: { className: "page_block" },
					child: tabsList,
				});

				return /** @type {HTMLDivElement} */(wrapper);
			},

			// #region Basic tabs

			/**
			 * Creates tab from provided properties
			 *
			 * @param {TabProperties} tabProps Properties for tab
			 * @returns {HTMLAnchorElement} Newly created tab element
			 */
			createTab(tabProps) {
				// see DECONSTRUCTOR#rightMenuItem for properties
				const tabElement = DOM.createElement("a", {
					props: {
						href: tabProps.url,
						innerText: "",
						className: "ui_tab",
					},
					events: {
						/**
						 * Function to navigate to the page
						 *
						 * @param {MouseEvent} e Event to be cancelled
						 */
						click: function onClick(e) {
							WINDOW.nav.go(this, e);
						},
					},
				});

				// TODO: Section names must be set manually!

				// Selection and forced visibility
				const { isSelected, isHidden } = tabProps;

				if (isSelected) tabElement.classList.add("ui_tab_sel");

				if (isHidden && !isSelected) UTIL.toggleHide(tabElement, true);

				// Label data property for tab group selection
				let labelContent;

				for (const child of tabProps.children) {
					tabElement.appendChild(child);

					if (child.tagName === "SPAN" && labelContent == null) {
						for (const node of child.childNodes) {
							if (node.nodeType === Node.TEXT_NODE) {
								labelContent = node.textContent;
							}
						}
					}
				}

				tabElement.dataset.defaultLabel = labelContent;

				return /** @type {HTMLAnchorElement} */ (tabElement);
			},


			/**
			 * Wraps tab into the list item element
			 *
			 * @param {HTMLAnchorElement | HTMLDivElement} [tab] Tab to wrap
			 * @param {boolean} assignRole Should be ARIA role be assigned to the wrap
			 * @returns {HTMLLIElement} List element ready for insertion
			 */
			wrapTab(tab, assignRole = true) {
				const wrap = /** @type {HTMLLIElement} */(DOM.createElement("li", {
					props: {
						className: "_wall_tab_own ui_tab_wrapper",
					},
					child: tab,
				}));

				if (assignRole) DOM.assignAttributes(wrap, { role: "menuitem" });

				if (tab != null) tab[$TABS_WRAP_TAB] = wrap;

				return wrap;
			},

			// #endregion

			// #region Groups

			/**
			 * Creates tab which stores other tabs as its menu items
			 *
			 * @param {string} groupName Name of the group to display
			 * @returns {HTMLDivElement} Group tab ready for insertion
			 */
			createGroupTab(groupName) {
				let labelElement;
				let itemsElement;

				// FIXME: possibly this element can be "li" like the others

				const groupTab = DOM.createElement("div", {
					props: {
						className: "ui_tab ui_tab_group",
					},
					attributes: {
						role: "link",
					},
					events: {
						mouseover: function onMouseOver() {
							return WINDOW.uiTabs.showGroup(this);
						},
						mouseout: function onMouseOut() {
							return WINDOW.uiTabs.hideGroup(this);
						},
					},
					children: [
						labelElement = DOM.createElement("span", {
							props: {
								className: "ui_tab_group_label",
								innerText: groupName,
							},
							dataset: {
								defaultLabel: groupName,
							},
						}),
						itemsElement = DOM.createElement("div", {
							props: {
								className: "ui_tab_group_items",
							},
						}),
					],
				});

				groupTab[$TABS_GROUP_TAB_LABEL] = labelElement;
				groupTab[$TABS_GROUP_TAB_ITEMS] = itemsElement;

				return /** @type {HTMLDivElement} */ (groupTab);
			},

			/**
			 * Inserts element to tab
			 *
			 * @param {HTMLDivElement} groupTab Group tab to insert items to
			 * @param {HTMLDivElement[]} items Wrapped items to insert to the group
			 */
			insertGroupTabItem(groupTab, items) {
				const itemsElement = groupTab[$TABS_GROUP_TAB_ITEMS];

				if (!itemsElement) {
					throw new Error("Cannot find items element for this group tab.");
				}

				for (const item of items) itemsElement.appendChild(item);
			},

			/**
			 * Wraps tab as item for the group tab
			 *
			 * @param {HTMLLinkElement} tab Tab to wrap
			 * @returns {HTMLDivElement} Item ready for insertion
			 */
			wrapGroupTabItem(tab) {
				const wrap = /** @type {HTMLDivElement} */ (DOM.createElement("div", {
					props: {
						className: "ui_tab_wrapper ui_tab_group_item",
					},
					child: tab,
				}));

				tab[$TABS_WRAP_GROUP_ITEM] = wrap;

				return wrap;
			},

			// #endregion

			// #region Getters

			// TODO: possibly, avoid using Symbols and use WeakMaps instead

			/**
			 * Gets Set of all tabs added to provided tabs list
			 *
			 * @param {HTMLUListElement} tabsList Tabs list element
			 * @returns {Set<HTMLAnchorElement> | undefined} Either Set or undefined
			 */
			getTabsSet(tabsList) {
				return tabsList[$TABS_LIST_TABS];
			},

			/**
			 * Gets hash map with tabs assigned to their section names
			 *
			 * @param {HTMLUListElement} tabsList Tabs list element
			 * @returns {Object.<string | symbol, HTMLAnchorElement | HTMLDivElement>} Tabs map
			 */
			getTabsMapping(tabsList) {
				return tabsList[$TABS_LIST_MAP];
			},

			/**
			 * Gets tab from the hash map of tabs for the list
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 * @param {string | symbol} id Tab identifier
			 * @returns {HTMLAnchorElement | HTMLDivElement | undefined} The tab
			 */
			getTabById(tabsList, id) {
				const tabsMap = this.getTabsMapping(tabsList);

				return tabsMap[id];
			},

			/**
			 * Associates ID with tab in hash map of tabs for the list
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 * @param {string | symbol} id Tab identifier
			 * @param {HTMLAnchorElement | HTMLDivElement | undefined} tab The tab
			 */
			setTabById(tabsList, id, tab) {
				const tabsMap = this.getTabsMapping(tabsList);

				tabsMap[id] = tab;
			},

			/**
			 * Gets Set of tabs that are displayed forcefully because they
			 * are either selected or forced to display on the other occasions
			 *
			 * @param {HTMLUListElement} tabsList Tabs list element
			 * @returns {Set<HTMLAnchorElement>} Set of forcefully displayed tabs
			 */
			getForceDisplayedTabs(tabsList) {
				return tabsList[$TABS_LIST_FORCED];
			},

			/**
			 * Checks whether the tab is selected or not
			 *
			 * @param {HTMLAnchorElement | HTMLDivElement} tab Tab
			 * @returns {boolean} Whether the tab is selected or not
			 */
			isTabSelected(tab) {
				return tab.classList.contains("ui_tab_sel");
			},

			// #endregion

			// #region Manipulation

			/**
			 * Hides all tabs that were displayed forcefully
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 * @param {HTMLAnchorElement | HTMLDivElement} currentTab Current tab
			 */
			forceDisplayedCleanup(tabsList, currentTab) {
				const forceDisplayedTabs = this.getForceDisplayedTabs(tabsList);

				for (const tab of forceDisplayedTabs) {
					if (currentTab === tab) continue;

					this.toggleTab(tab, false);

					forceDisplayedTabs.delete(tab);
				}
			},


			/**
			 * Toggles tab display state
			 *
			 * @param {HTMLAnchorElement | HTMLDivElement} tab Tab to toggle
			 * @param {boolean} state Whether the tab should be displayed
			 */
			async toggleTab(tab, state) {
				UTIL.toggleHide(tab, !state);
			},

			// #endregion
		};
	})();

	/**
	 * Collection of methods to work with actions menu
	 */
	const ACTION_MENU = {
		/**
		 * Toggles action menu item check display status
		 *
		 * @param {HTMLDivElement} menuItem Menu item element
		 * @param {boolean} state State of the checkmark
		 */
		toggleMenuItemCheck(menuItem, state) {
			menuItem.classList[state ? "add" : "remove"]("checked");

			menuItem.setAttribute("aria-checked", `${state}`);
		},

		/**
		 * Checks whether menu item element includes
		 *
		 * @param {HTMLDivElement} menuItem Menu item element
		 * @returns {boolean} Whether the checkbox is checked
		 */
		isMenuItemChecked(menuItem) {
			return menuItem.classList.contains("checked");
		},

		/**
		 * Creates new menu item checkbox
		 *
		 * @param {string} text Text inside the menu item
		 * @param {boolean} currentState Initial menu item checked state
		 * @param {function(boolean)} onToggle Callback to call on click
		 * @returns {HTMLDivElement} Checkbox menu item (or "toggle" simply put)
		 */
		createMenuItemCheckebox(text, currentState = true, onToggle) {
			const menuItem = /** @type {HTMLDivElement} */(
				DOM.createElement("div", {
					props: {
						className: "ui_actions_menu_item",
						innerText: text,
					},
					events: {
						click: () => {
							const newState = !currentState;

							const cancelled = !onToggle(newState);

							if (cancelled) return;

							this.toggleMenuItemCheck(menuItem, newState);

							currentState = newState;
						},
					},
					attributes: { role: "checkbox" },
				})
			);

			this.toggleMenuItemCheck(menuItem, currentState);

			return menuItem;
		},

		/**
		 * Creates new menu item separator
		 *
		 * @returns {HTMLDivElement} Separator menu item
		 */
		createMenuItemSeparator() {
			return /** @type {HTMLDivElement} */ (
				DOM.createElement("div", {
					props: {
						className: "ui_actions_menu_sep",
					},
				})
			);
		},
	};

	/**
	 * Collection of methods used to query page blocks
	 */
	const TARGETS = {
		/**
		 * Queries feed block at the center of the page where news are located
		 *
		 * @param {HTMLElement | Document} scope Scope of query
		 * @returns {HTMLDivElement | undefined} Main feed block
		 */
		getFeedBlock(scope = document) {
			return scope.querySelector("#main_feed");
		},
		/**
		 * Queries submenu from the right menu which contains all tabs
		 *
		 * @param {HTMLElement | Document} scope Scope of query
		 * @returns {HTMLUListElement | undefined} Right sub menu
		 */
		getRightSubMenuItems(scope = document) {
			return scope.querySelector("#ui_rmenu_news_list");
		},
		/**
		 * Queries "News" button from the right menu
		 *
		 * @param {HTMLElement | Document} scope Scope of query
		 * @returns {HTMLAnchorElement | undefined} "Newns" button
		 */
		getNewsButton(scope = document) {
			return scope.querySelector("#ui_rmenu_news");
		},
		/**
		 * Queries "Filter" button from the right menu
		 *
		 * @param {HTMLElement | Document} scope Scope of query
		 * @returns {HTMLDivElement | undefined} "Filter" button
		 */
		getFilterIcon(scope = document) {
			return scope.querySelector(".feed_filter_icon");
		},
		/**
		 * Queries "Lists" button from the right menu
		 *
		 * @param {HTMLElement | Document} scope Scope of query
		 * @returns {HTMLDivElement | undefined} Lists button
		 */
		getListsButton(scope = document) {
			return scope.querySelector("#feed_add_list_icon");
		},
		/**
		 * Queries actions menu for "Lists" button from the right menu
		 *
		 * @param {HTMLElement} scope Scope of query
		 * @returns {HTMLDivElement | undefined} Actions menu
		 */
		getListsActionMenu(scope) {
			return scope.querySelector(".ui_actions_menu");
		},
		/**
		 * Queries actions menu item
		 *
		 * @param {HTMLDivElement} scope Actions menu
		 * @param {string} className Menu item class names
		 * @returns {HTMLDivElement | undefined} Actions menu item
		 */
		getActionMenuItem(scope, className) {
			let fullClassName = ".ui_actions_menu_item";

			if (className != null) fullClassName += className;

			return scope.querySelector(fullClassName);
		},
		/**
		 * Queries action menu item for the custom list
		 *
		 * @param {HTMLDivElement} scope Actions menu
		 * @param {string} listId ID of the list
		 * @returns {?HTMLDivElement} List item
		 */
		getActionMenuCustomListItem(scope, listId) {
			return scope.querySelector(`.feed_filter_list${listId}`);
		},
		/**
		 * Queries stories block
		 *
		 * @param {HTMLElement | Document} scope Scope of query
		 * @returns {HTMLDivElement | undefined} Stories block
		 */
		getStoriesBlock(scope = document) {
			return scope.querySelector(".page_block.stories_feed_wrap");
		},
		/**
		 * Queries "Write post" block
		 *
		 * @param {HTMLElement | Document} scope Scope of query
		 * @returns {HTMLDivElement | undefined} "Write post" block
		 */
		getWritePostBlock(scope = document) {
			return scope.querySelector(".wall_module.page_block.feed_post_field_wrap");
		},
		/**
		 * Queries first action menu item for custom list
		 *
		 * @param {HTMLDivElement} scope Actions menu
		 * @returns {HTMLDivElement | undefined} Custom list actions menu item
		 */
		getCustomListActionMenuItem(scope) {
			return this.getActionMenuItem(scope, ".feed_custom_list");
		},
		/**
		 * Queries first action menu separator
		 *
		 * @param {HTMLDivElement} scope Actions menu
		 * @returns {HTMLDivElement | undefined} First actions menu separator
		 */
		getActionMenuSeparator(scope) {
			return scope.querySelector(".ui_actions_menu_sep");
		},
		/**
		 * Queries label element in actions menu item
		 *
		 * @param {HTMLDivElement} scope Actions menu remove button
		 * @returns {HTMLDivElement | undefined} Label
		 */
		getActionMenuListLabel(scope) {
			return scope.querySelector(".ui_actions_menu_item_label");
		},
		/**
		 * Queries "Remove list" button
		 *
		 * @param {HTMLDivElement} scope Actions menu item
		 * @returns {HTMLDivElement | undefined} "Remove list" button
		 */
		getActionMenuListRemove(scope) {
			return scope.querySelector(".ui_actions_menu_hide");
		},
	};

	/**
	 * Collection of methods dedicated to deconstruct common VK elements
	 */
	const DECONSTRUCTOR = {
		/**
		 * Deconstructs right menu item in the form of tab properties
		 *
		 * @param {HTMLAnchorElement} tab Right menu item
		 * @returns {TabProperties} Tab properties
		 */
		rightMenuItem(tab) {
			const isSelected = tab.classList.contains("ui_rmenu_item_sel");
			const isHidden = tab.classList.contains("ui_rmenu_item_hidden");
			const { children } = tab;

			let url = tab.href;

			if (url.startsWith("https://vk.com/")) {
				url = url.slice("https://vk.com/".length);
			}

			return {
				url: tab.href,
				isSelected,
				isHidden,
				children,
			};
		},
	};

	/**
	 * Collection of methods implementing tabs grouping logic
	 */
	const GROUPING = (function groupingScope() {
		const $GROUPING_WRAP_FUNCTIONS = Symbol("wrapFunctions");
		const $GROUPING_APPEARANCES = Symbol("appearances");
		const $GROUPING_OFFSETS = Symbol("offsets");
		const $GROUPING_MORE_GROUP_WIDTH = Symbol("moreGroupWidth");

		return {
			/**
			 * Wrap function assigned to their symbols
			 */
			[$GROUPING_WRAP_FUNCTIONS]: {
				[$TABS_WRAP_TAB]: TABS_LIST.wrapTab,
				[$TABS_WRAP_GROUP_ITEM]: TABS_LIST.wrapGroupTabItem,
			},

			/**
			 * @callback PostWrapFunction
			 * @param {HTMLAnchorElement} tab Tab which was wrapped
			 * @param {HTMLElement} wrap Wrap where tab was wrapped
			 */

			/**
			 * @typedef TabAppearance
			 * @property {string} addClassName Class name to add
			 * @property {string} removeClassName Class name to remove
			 * @property {symbol} appearanceWrap Symbol of appearance wrap
			 * @property {symbol} removeWrap Symbol of unused appearance wrap
			 * @property {PostWrapFunction} [postWrap] Function to call after wrapping
			 */

			/**
			 * @typedef TabAppearancesCollection
			 * @property {TabAppearance} tab Tab appearance declaration
			 * @property {TabAppearance} groupItem Group item appearance declaration
			 */

			/**
			 * Collection of appearance declarations
			 *
			 * @type {TabAppearancesCollection}
			 */
			[$GROUPING_APPEARANCES]: {
				/**
				 * Tab appearance declaration
				 */
				tab: {
					addClassName: "ui_tab",
					removeClassName: "ui_tab_group_item",
					appearanceWrap: $TABS_WRAP_TAB,
					removeWrap: $TABS_WRAP_GROUP_ITEM,
				},

				/**
				 * Group item appearance declaration
				 */
				groupItem: {
					addClassName: "ui_tab_group_item",
					removeClassName: "ui_tab",
					appearanceWrap: $TABS_WRAP_GROUP_ITEM,
					removeWrap: $TABS_WRAP_TAB,
				},
			},

			/**
			 * Changes tab appearance based on provided declaration
			 *
			 * @param {HTMLAnchorElement} tab Tab which appearance to change
			 * @param {TabAppearance} appearance Appearance declaration
			 * @returns {HTMLElement} Wrap where element is located
			 */
			changeTabAppearance(tab, appearance) {
				tab.classList.add(appearance.addClassName);
				tab.classList.remove(appearance.removeClassName);

				let wrap = /** @type {HTMLElement} */ (tab[appearance.appearanceWrap]);

				const mustCreateWrap = wrap == null;

				const removeWrap = /** @type {HTMLElement} */ (tab[appearance.removeWrap]);

				if (mustCreateWrap) {
					/** @type {function(HTMLAnchorElement):HTMLElement} */
					const wrapFunction = this[$GROUPING_WRAP_FUNCTIONS][appearance.appearanceWrap];

					wrap = wrapFunction(tab);

					tab[appearance.appearanceWrap] = wrap;
				}

				if (removeWrap) removeWrap.remove();

				if (!mustCreateWrap && UTIL.isChildOf(wrap, tab)) return wrap;

				wrap.appendChild(tab);

				UTIL.toggleHide(wrap, UTIL.isHidden(tab));

				if (appearance.postWrap) appearance.postWrap(tab, wrap);

				return wrap;
			},

			/**
			 * Adds "More" group for tabs that did not fit
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 * @returns {HTMLDivElement} More group
			 */
			addMoreGroup(tabsList) {
				const moreGroup = TABS_LIST.createGroupTab(
					L10N.getString("moreGroupLabel"),
				);

				tabsList.appendChild(moreGroup);

				moreGroup[$GROUPING_MORE_GROUP_WIDTH] = moreGroup.offsetWidth;

				TABS_LIST.setTabById(tabsList, $ID_MORE_GROUP, moreGroup);

				return moreGroup;
			},

			/**
			 * Offsets for tabs list width
			 */
			[$GROUPING_OFFSETS]: {
				/**
				 * Offset for lists button
				 */
				listsButton: 32,
				/**
				 * Padding for the list itself
				 */
				blockPadding: 10 * 2,
				/**
				 * Just safe space
				 */
				safeSpace: 40,
			},

			/**
			 * Puts all tabs to the main element until one doesn't fit,
			 * then groups it and all further tabs under "More" group tab
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			reflowTabs(tabsList) {
				console.trace("[TABBY TABS] (!) REFLOW HERE");

				const tabs = TABS_LIST.getTabsSet(tabsList);

				const newsTab = TABS_LIST.getTabById(tabsList, "news");
				const moreGroup = TABS_LIST.getTabById(tabsList, $ID_MORE_GROUP);
				const moreGroupItems = /** @type {HTMLDivElement} */ (moreGroup[$TABS_GROUP_TAB_ITEMS]);

				const offsets = this[$GROUPING_OFFSETS];

				/**-
				 * Calculates available space for all tabs
				 */
				const availableSpace = (
					tabsList.offsetWidth
					- newsTab.offsetWidth
					- offsets.listsButton
					- offsets.blockPadding
					- offsets.safeSpace
					- (UTIL.isHidden(moreGroup)
						? moreGroup[$GROUPING_MORE_GROUP_WIDTH]
						: moreGroup.offsetWidth)
				);

				console.log(`[TABBY TABS] Reflow calculated available space: ${availableSpace}`);

				let isGrouping;

				{
					let totalWidth = 0;

					const wrapAppearances = this[$GROUPING_APPEARANCES];

					const debugReflow = [];

					for (const tab of tabs) {
						if (tab === newsTab) continue;

						const debugEntry = { ref: tab };

						debugReflow.push(debugEntry);

						// if (UTIL.isHidden(tab)) continue;

						// Tabs have to be mounted in order to calculate their width,
						// offsetWidth and other properties will be 0 if not mounted,
						// because no styles applied to the element

						// BUG: If tab is mounted as the group item and will we re-mounted
						// as normal tab, we have to remove moreGroup's selection class and
						// reset its label to default one

						const wasTabGroupItem = tab.parentElement === tab[$TABS_WRAP_GROUP_ITEM];

						if (!isGrouping) {
							const tabWrap = this.changeTabAppearance(
								tab, wrapAppearances.tab,
							);

							tabsList.appendChild(tabWrap);

							debugEntry.width = tab.offsetWidth;

							debugEntry.spaceLeft = availableSpace - totalWidth;

							totalWidth += tab.offsetWidth;

							debugEntry.totalAfter = totalWidth;

							isGrouping = totalWidth >= availableSpace;

							debugEntry.causedGrouping = isGrouping;
						}

						if (isGrouping) {
							debugEntry.groupped = true;

							const groupItemWrap = this.changeTabAppearance(
								tab, wrapAppearances.groupItem,
							);

							UTIL.appendIfNotChild(groupItemWrap, moreGroupItems);
						} else if (wasTabGroupItem) {
							moreGroup.classList.remove("ui_tab_group_sel");

							WINDOW.uiTabs.resetLabel(moreGroup);
						}
					}

					console.log("[TABBY TABS] Reflow debug:", debugReflow);
				}

				// Changing "More" group visibility based of whether it has anything
				UTIL.toggleHide(moreGroup, !isGrouping);

				// We have to ensure that "More" group is always at the end
				tabsList.appendChild(moreGroup);
			},
		};
	})();

	/**
	 * @callback TabToggleFallback
	 * @param {string} section Section name
	 * @param {boolean} state Tab display state
	 */

	/**
	 * Collection of methods implementing secret tabs logic
	 */
	const SECRET_TABS = (function secretTabsScope() {
		const $IS_SECRET_NAME = Symbol("isSecretName");
		const $SECRET_EYE = Symbol("secretEye");
		const $SECRET_EYE_CONTAINER = Symbol("secretEyeContainer");
		const $SECRET_LIST_CSS = Symbol("secretListCss");
		const $SECRET_LIST_ITEMS = Symbol("secretListItems");

		return {
			/**
			 * Toggles display of secret tabs
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 * @param {boolean} state Display state of secret tabs
			 */
			toggleSecretTabs(tabsList, state) {
				tabsList.classList.toggle("tabby_secrets", !state);

				GROUPING.reflowTabs(tabsList);
			},

			/**
			 * Adds hidden button for blind users to display secret tabs
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			addSecretTabAccessor(tabsList) {
				const checkbox = DOM.createElement("input", {
					props: {
						type: "checkbox",
						id: "tabbytabs_secret_tabs",
					},
					events: {
						/**
						 * Whatever happens on checkbox state change
						 *
						 * @param {*} e Event
						 */
						change(e) {
							SECRET_TABS.toggleSecretTabs(
								tabsList,
								e.target.checked,
							);
						},
					},
				});

				const label = DOM.createElement("label", {
					props: {
						innerText: L10N.getString("secretTabsLabel"),
						for: "tabbytabs_secret_tabs",
					},
				});

				const listItem = TABS_LIST.wrapTab();

				listItem.appendChild(checkbox);
				listItem.appendChild(label);
				listItem.classList.add("tabby_tabs_sro");

				tabsList.appendChild(listItem);
			},

			/**
			 * Adds an event used to toggle secret tabs display
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			addSecretToggleEvent(tabsList) {
				let currentState = false;

				/**
				 * Whatever happens on click
				 *
				 * @param {MouseEvent} e Click event
				 */
				function onSecretClick(e) {
					if (!e.ctrlKey || e.target !== tabsList) return;

					currentState = !currentState;

					SECRET_TABS.toggleSecretTabs(tabsList, currentState);
				}

				tabsList.addEventListener("click", onSecretClick);
			},

			/**
			 * Inits secret tabs events
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			initSecretTabs(tabsList) {
				tabsList.classList.add("tabby_secrets");

				SECRET_TABS.addSecretTabAccessor(tabsList);
				SECRET_TABS.addSecretToggleEvent(tabsList);
			},

			/**
			 * @typedef SecretTabCheckResult
			 * @property {boolean} isSecret Whether the tab is secret
			 * @property {string} [normalizedName] Normalized name
			 */

			/**
			 * Check whether name of the tab is secret
			 *
			 * @param {string} tabName Name to check
			 * @returns {SecretTabCheckResult} Check result
			 */
			[$IS_SECRET_NAME](tabName) {
				const isSecret = tabName.startsWith(".*")
					&& tabName.endsWith("*.");

				if (isSecret) {
					return {
						isSecret,
						normalizedName: tabName.slice(2, -2),
					};
				}

				return { isSecret };
			},

			/**
			 * Checks whether the tab is secret and tags it
			 *
			 * @param {HTMLAnchorElement} tab Tab to check
			 */
			checkIsSecret(tab) {
				const tabNameSpan = tab.querySelector("span");

				if (tabNameSpan == null) return;

				const tabName = tabNameSpan.textContent;

				const secretCheck = SECRET_TABS[$IS_SECRET_NAME](tabName);

				if (secretCheck.isSecret) {
					tabNameSpan.textContent = secretCheck.normalizedName;

					tab.classList.add("tabby_secret");
				} else {
					tab.classList.remove("tabby_secret");
				}
			},

			/**
			 * Checks whether the menu item is a one for secret tab
			 *
			 * @param {HTMLDivElement} menuItem Menu item
			 * @param {HTMLDivElement} [labelDiv] DIV element with tab label
			 */
			checkIsSecretItem(menuItem, labelDiv) {
				if (labelDiv == null) {
					labelDiv = TARGETS.getActionMenuListLabel(menuItem);
				}

				if (labelDiv == null) return;

				const tabName = labelDiv.textContent;

				const secretCheck = SECRET_TABS[$IS_SECRET_NAME](tabName);

				if (secretCheck.isSecret) {
					labelDiv.textContent = secretCheck.normalizedName;

					menuItem.classList.add("tabby_secret");
				} else {
					menuItem.classList.remove("tabby_secret");
				}
			},

			// #region VK List Add Integration

			/**
			 * Secret eye element for later re-use
			 */
			[$SECRET_EYE]: null,

			/**
			 * Weak map of container and its items
			 */
			[$SECRET_LIST_ITEMS]: new WeakMap(),

			/**
			 * List for the VK List Add container
			 */
			[$SECRET_LIST_CSS]: [
				`.secret_eye::before {
					content: '';
					display: block;
					width: 14px;
					height: 14px;
					background: url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2210%22%20viewBox%3D%221%202%2014%2010%22%20style%3D%22fill%3A%23828a99%3B%22%3E%3Cpath%20d%3D%22M8%2012C3.8%2012%201%208%201%207%201%206%203.8%202%208%202%2012.2%202%2015%206%2015%207%2015%208%2012.2%2012%208%2012ZM8%2010.5C9.9%2010.5%2011.5%208.9%2011.5%207%2011.5%205.1%209.9%203.5%208%203.5%206.1%203.5%204.5%205.1%204.5%207%204.5%208.9%206.1%2010.5%208%2010.5ZM8%208.6C7.1%208.6%206.4%207.9%206.4%207%206.4%206.1%207.1%205.4%208%205.4%208.9%205.4%209.6%206.1%209.6%207%209.6%207.9%208.9%208.6%208%208.6Z%22%2F%3E%3C%2Fsvg%3E") no-repeat 50% / contain;
				}`,
				`.lists_container .secret_eye {
					float: right;
					transition: .25s opacity;
				}`,
				`.lists_container.tabby_secrets_list .secret_eye {
					opacity: 0.5;
				}`,
			],

			/**
			 * Toggles display state of secret tabs
			 *
			 * @param {HTMLDivElement} container Lists container
			 * @param {boolean} [state] State of toggle
			 * @param {boolean} [choreographed] Should tabs be hidden by choreographer
			 * @returns {boolean} Toggled state
			 */
			toggleSecretList(container, state, choreographed = true) {
				const secretTabs = this.getSecretTabsSet(container);

				state = container.classList.toggle(
					"tabby_secrets_list",
					state != null ? !state : undefined,
				);

				for (const tab of secretTabs) {
					if (choreographed) {
						CHOREOGRAPHER.toggleCollapse(
							tab,
							state,
							false, // is horizontal
							300, // 300ms is good
							true, // overflow must be hidden
						);
					} else {
						UTIL.toggleHide(tab, true);
					}
				}

				return state;
			},

			/**
			 * Add secret tabs eye to the VK List Add container
			 *
			 * @param {HTMLDivElement} container Lists container
			 */
			prepareContainer(container) {
				this.toggleSecretList(container, false, false);

				let eye = this[$SECRET_EYE];

				if (eye == null) {
					const eyeLabel = L10N.getString("secretTabsLabel");

					eye = DOM.createElement("div", {
						props: {
							className: "secret_eye",
							innerText: " ",
							tabIndex: 0,
						},
						events: {
							/**
							 * Whatever happens on click
							 */
							click() {
								const newState = !SECRET_TABS.toggleSecretList(
									eye[$SECRET_EYE_CONTAINER],
								);

								eye.setAttribute("aria-checked", `${newState}`);
							},
							mouseover() {
								WINDOW.showTitle(eye, eyeLabel);
							},
							/**
							 * Whatever happens on key press
							 *
							 * @param {KeyboardEvent} e Keyboard event
							 */
							keyup(e) {
								if (e.key === " ") eye.click();
							},
						},
						attributes: {
							"aria-role": "checkbox",
							"aria-label": eyeLabel,
							"aria-checked": "false",
						},
					});

					this[$SECRET_EYE] = eye;
				} else if (eye.tt != null) {
					eye.tt.destroy();
				}

				eye[$SECRET_EYE_CONTAINER] = container;

				container.prepend(eye);
			},

			/**
			 * Gets set of secret tabs for the selected container
			 *
			 * @param {HTMLDivElement} container List container
			 * @returns {Set} Set of secret tabs
			 */
			getSecretTabsSet(container) {
				const map = this[$SECRET_LIST_ITEMS];

				let list = map.get(container);

				if (list == null) {
					map.set(
						container,
						list = new Set(),
					);
				}

				return list;
			},

			/**
			 * Checks if VK List Add row contains secret list
			 *
			 * @param {HTMLDivElement} row List row
			 * @param {Set} secretTabsList Set of secret tabs
			 */
			checkIsSecretListRow(row, secretTabsList) {
				const label = row.querySelector("label");

				if (label == null) return;

				const tabName = label.textContent;

				const secretCheck = SECRET_TABS[$IS_SECRET_NAME](tabName);

				if (secretCheck.isSecret) {
					label.textContent = secretCheck.normalizedName;

					row.classList.add("tabby_secret");

					secretTabsList.add(row);
				} else {
					row.classList.remove("tabby_secret");

					secretTabsList.delete(row);
				}
			},

			initSecretListCSS() {
				STYLES.addStyle("VK List Add Secrets", ...SECRET_TABS[$SECRET_LIST_CSS]);
			},

			// #endregion
		};
	})();

	/**
	 * Collection of methods related to manipulation with tabs list
	 */
	const MANIPULATION = (function manipulationScope() {
		const $MANIPULATION_SWITCH_FUNCTIONS = Symbol("switchFunctions");
		const $MANIPULATION_STUB_TAB = Symbol("stubTab");

		const manipulation = {
			/**
			 * Recreates all tabs from right menu
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			recreateTabs(tabsList) {
				const rightSubMenu = TARGETS.getRightSubMenuItems();
				const items = UTIL.toArray(rightSubMenu.childNodes);

				const tabs = TABS_LIST.getTabsSet(tabsList);
				const sectionsMap = TABS_LIST.getTabsMapping(tabsList);
				const forcedTabs = TABS_LIST.getForceDisplayedTabs(tabsList);

				/**
				 * Converts right menu link to tab, maps it
				 * to the section and adds to needed sets
				 *
				 * @param {Node} node Right menu link
				 */
				function convertMenuItem(node) {
					if (node.nodeType !== Node.ELEMENT_NODE) return;

					const item = /** @type {HTMLAnchorElement} */ (node);
					const itemSection = item.className.match(SECTION_CLASS_REGEXP)[1];

					const tabProperties = DECONSTRUCTOR.rightMenuItem(item);

					const tab = TABS_LIST.createTab(tabProperties);

					DOM.addEventListeners(tab, {
						click() {
							TABS_LIST.forceDisplayedCleanup(tabsList, tab);
						},
					});

					tabs.add(tab);

					const tabWrap = TABS_LIST.wrapTab(tab);

					tabsList.appendChild(tabWrap);

					SECRET_TABS.checkIsSecret(tab);

					sectionsMap[itemSection] = tab;

					if (tabProperties.isHidden && tabProperties.isSelected) {
						forcedTabs.add(tab);
					}

					item.remove();
				}

				UTIL.forEach(items, convertMenuItem);
			},

			/**
			 * Creates "News" link which is separate category
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			moveNews(tabsList) {
				const newsButton = TARGETS.getNewsButton();

				if (newsButton == null) throw new Error("No news button found.");

				const tabProperties = DECONSTRUCTOR.rightMenuItem(newsButton);

				const tab = TABS_LIST.createTab(tabProperties);

				// This tab is kind of special because it contains filter button

				// TODO: add gears instead to own pages

				DOM.assignStyles(tab, {
					position: "relative",
					paddingRight: "25px",
				});

				{ // Filter button must be formatted a little too
					const filterButton = TARGETS.getFilterIcon(tab);

					DOM.assignStyles(filterButton, {
						margin: "unset",
						position: "absolute",
						// FIXME: I'm a magic number, nobody likes me T_T
						top: "14px",
						right: "0",
					});

					const buttonName = L10N.getString("newsFilterButtonName");

					DOM.assignAttributes(filterButton, {
						role: "button",
						"aria-label": buttonName,
					});

					/**
					 * Shows tooltip on news button
					 */
					function showNewsButtonTooltip() { // eslint-disable-line no-inner-declarations
						WINDOW.showTitle(this, buttonName);
					}

					filterButton.addEventListener("click", showNewsButtonTooltip);
				}

				const wrapped = TABS_LIST.wrapTab(tab);

				tabsList.prepend(wrapped);

				TABS_LIST.getTabsSet(tabsList).add(tab);
				TABS_LIST.setTabById(tabsList, "news", tab);

				newsButton.remove();
			},

			// #region Fancy togglers

			/**
			 * @callback ActionsMenuInsert
			 * @param {HTMLDivElement} item Item to insert
			 */

			/**
			 * Everything about hiding the stories an' stuff
			 *
			 * @param {ActionsMenuInsert} insertItem Function to insert item
			 */
			async addStoriesBlockToggler(insertItem) {
				const storiesBlock = TARGETS.getStoriesBlock();

				if (!storiesBlock) return;

				const vkOpt = WINDOW.vkopt;

				const currentState = vkOpt != null
					? vkOpt.settings.get("hide_stories") !== 1
					: await USERSCRIPT.getSetting("storiesShown", "boolean", true);

				if (vkOpt) {
					// As we are replacing vkOpt's functionality here, we'd better remove its class
					document.querySelector("html").classList.remove("vk_hide_stories");
				}

				/**
				 * Toggles stories block display state
				 *
				 * @param {boolean} state Display state of stories block
				 * @param {boolean} [choreographed] Whether choreographer toggles display state
				 * @param {boolean} [save] Should be the state saved to script's settings
				 * @returns {boolean} Whether the checkbox state must be changed
				 */
				function toggleStories(state, choreographed = true, save = true) {
					if (choreographed) {
						CHOREOGRAPHER.toggleCollapse(storiesBlock, !state);
					} else {
						UTIL.toggleHide(storiesBlock, !state);
					}

					if (save) {
						USERSCRIPT.setSetting("storiesShown", state);

						if (vkOpt) vkOpt.settings.set("hide_stories", state ? "" : 1);
					}

					return true;
				}

				const toggleMenuItem = ACTION_MENU.createMenuItemCheckebox(
					L10N.getString("storiesBlockName"),
					currentState,
					toggleStories,
				);

				if (vkOpt != null) {
					DOM.createElement("span", {
						props: { innerText: " · " },
						attributes: { "aria-hidden": "true" },
						mount: toggleMenuItem,
					});

					const labelText = L10N.getString("vkOptManagedLabel");

					DOM.createElement("span", {
						props: {
							innerText: "VkOpt",
						},
						style: {
							color: "#939699",
							cursor: "help",
						},
						events: {
							mouseover() {
								WINDOW.showTitle(this, labelText);
							},
						},
						attributes: { "aria-label": labelText },
						mount: toggleMenuItem,
					});
				}

				insertItem(toggleMenuItem);

				if (!currentState) toggleStories(currentState, false, false);
			},

			/**
			 * Adds "New post" block
			 *
			 * @param {ActionsMenuInsert} insertItem Function to insert item
			 */
			async addPostBlockToggler(insertItem) {
				const writePostBlock = TARGETS.getWritePostBlock();

				if (!writePostBlock) return;

				const currentState = await USERSCRIPT.getSetting(
					"writePostShown",
					"boolean",
					true,
				);

				// FIXME: instead of copypasting let's make universal functions

				/**
				 * Toggles "New post" block display state
				 *
				 * @param {boolean} state Display state of the block
				 * @param {boolean} [choreographed] Whether choreographer toggles display state
				 * @param {boolean} [save] Should be the state saved to script's settings
				 * @returns {boolean} Whether checkbox state must be changed
				 */
				function toggleWriteBlock(state, choreographed = true, save = true) {
					if (choreographed) {
						CHOREOGRAPHER.toggleCollapse(writePostBlock, !state);
					} else {
						UTIL.toggleHide(writePostBlock, !state);
					}

					if (save) USERSCRIPT.setSetting("writePostShown", state);

					return true;
				}

				const toggleMenuItem = ACTION_MENU.createMenuItemCheckebox(
					L10N.getString("postBlockName"),
					currentState,
					toggleWriteBlock,
				);

				insertItem(toggleMenuItem);

				if (!currentState) toggleWriteBlock(currentState, false, false);
			},

			/**
			 * Adds various fancy togglers to hide or show various things
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			async addFancyTogglers(tabsList) {
				const menu = /** @type {HTMLDivElement} */ (
					TABS_LIST.getTabById(tabsList, $ID_LISTS_MENU)
				);

				const referenceNode = TARGETS.getActionMenuSeparator(menu);

				const separator = ACTION_MENU.createMenuItemSeparator();

				let separatorClicks = 0;

				/**
				 * Whatever happens of separator click
				 */
				function onSeparatorClick() {
					// eslint-disable-next-line no-plusplus
					if ((++separatorClicks % 5) === 0) {
						WINDOW.showDoneBox(";)", { timeout: 1000 });
					}
				}

				separator.addEventListener("click", onSeparatorClick);

				menu.insertBefore(
					separator,
					referenceNode,
				);

				/**
				 * @type {ActionsMenuInsert}
				 */
				function insertMenuItem(item) {
					menu.insertBefore(item, referenceNode);
				}

				await this.addPostBlockToggler(insertMenuItem);
				await this.addStoriesBlockToggler(insertMenuItem);
			},

			// #endregion

			/**
			 * Moves filters to its own place in our tabs list
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			moveListsButton(tabsList) {
				const listsButton = TARGETS.getListsButton();

				if (listsButton == null) throw new Error("No lists button found.");

				const wrapped = TABS_LIST.wrapTab(listsButton);

				DOM.assignStyles(wrapped, {
					position: "relative",
					top: "7px",
				});

				{
					const actionsMenu = TARGETS.getListsActionMenu(listsButton);

					actionsMenu.setAttribute("role", "button");

					DOM.assignStyles(actionsMenu, { right: "-10px" });

					for (const ch of actionsMenu.children) {
						const child = /** @type {HTMLDivElement} */ (ch);

						if (child.classList.contains("feed_custom_list")) {
							const labelDiv = TARGETS.getActionMenuListLabel(child);

							SECRET_TABS.checkIsSecretItem(child, labelDiv);

							const listName = labelDiv.innerText;
							const removeButton = TARGETS.getActionMenuListRemove(child);

							const editLabel = L10N.getString("editListButtonLabel", {
								listName,
							});

							const removeLabel = L10N.getString(
								"removeListButtonLabel",
								{ listName },
							);

							child.setAttribute("aria-label", editLabel);
							removeButton.setAttribute("aria-label", removeLabel);
						} else if (child.classList.contains("ui_actions_menu_sep")) {
							child.setAttribute("role", "separator");
						} else if (!child.classList.contains("feed_new_list")) {
							// is a checkbox
							child.setAttribute("role", "checkbox");
							child.setAttribute(
								"aria-checked",
								`${child.classList.contains("checked")}`,
							);
						}
					}

					TABS_LIST.setTabById(tabsList, $ID_LISTS_MENU, actionsMenu);
				}

				tabsList.appendChild(wrapped);
			},

			/**
			 * Adds slider which is used for navigation animations
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 * @returns {HTMLDivElement} UI Tabs slider
			 */
			addTabsSlider(tabsList) {
				// FIXME: possibly this element can be "li" like others

				const tabWrap = TABS_LIST.wrapTab();

				tabWrap.setAttribute("aria-hidden", "true");

				const slider = /** @type {HTMLDivElement} */(
					DOM.createElement("div", {
						props: {
							className: "ui_tabs_slider _ui_tabs_slider",
						},
						attributes: {
							"aria-hidden": "true",
						},
						mount: tabWrap,
					})
				);

				tabsList.appendChild(tabWrap);

				return slider;
			},

			/**
			 * @param {HTMLUListElement} tabsList Tabs list
			 * @param {string} section Tab identifier (section name)
			 * @param {boolean} state State of the tab display
			 * @param {TabToggleFallback} fallbackFunction Fallback function
			 */
			toggleTab(tabsList, section, state, fallbackFunction) {
				const tab = TABS_LIST.getTabById(tabsList, section);

				if (tab == null) {
					fallbackFunction(section, state);

					return;
				}

				if (TABS_LIST.isTabSelected(tab)) {
					// If tab is selected, we have to redirect to "News" tab
					TABS_LIST.getTabById(tabsList, "news").click();
				}

				TABS_LIST.toggleTab(tab, state);

				GROUPING.reflowTabs(tabsList);
			},

			// #region Feed functions wrapping

			/**
			 * Creates a tab which is always hidden and which only purpose
			 * is to be referenced to `uiTabs.switchTab` function whenever
			 * user selects left category from the right menu list
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			createStubTab(tabsList) {
				const label = DOM.createElement("span", {
					props: {
						innerText: " =＾• ⋏ •＾=",
					},
				});

				const tab = TABS_LIST.createTab({
					isHidden: true,
					isSelected: false,
					children: [label],
					url: "feed",
				});

				TABS_LIST.getTabsSet(tabsList).add(tab);
				TABS_LIST.setTabById(tabsList, $MANIPULATION_STUB_TAB, tab);

				tabsList.appendChild(
					TABS_LIST.wrapTab(tab),
				);
			},

			/**
			 * @typedef ListChanges
			 * @property {string} listName New name for the list
			 * @property {string | number} listId ID of the list changed
			 */

			/**
			 * Wraps VK's `feed.editList` function to reflect changes on tabs
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			wrapEditFunction(tabsList) {
				const { feed } = WINDOW;
				const fcName = "onListSave";

				const originalFunction = feed[fcName];

				if (WRAPPING.isWrapped(originalFunction)) return;

				/**
				 * @param {ListChanges} changes Changes to the list
				 */
				function onListSave(changes) {
					const { listName, listId } = changes;

					if (listId === -1) return;

					try {
						const tab = TABS_LIST.getTabById(tabsList, `list${listId}`);

						if (tab == null) throw new Error(`Unable to find tab with ID "${listId}"`);

						tab.dataset.defaultLabel = listName;

						tab.querySelector("span").innerText = listName;
					} catch (err) {
						console.error("[TABBY TABS] (!) Failed to reflect changes of edit (TAB):", err);
					}

					try {
						const actionMenu = TARGETS.getListsActionMenu(tabsList);

						if (actionMenu == null) throw new Error("Unable to find actions menu");

						const actionMenuItem = TARGETS.getActionMenuCustomListItem(
							actionMenu,
							`${listId}`,
						);

						if (actionMenuItem == null) throw new Error(`Unable to find actions menu item with ID "${listId}"`);

						const label = TARGETS.getActionMenuListLabel(actionMenuItem);

						if (label == null) throw new Error("Unable to find label for actions menu item");

						label.innerText = listName;
					} catch (err) {
						console.error("[TABBY TABS] (!) Failed to reflect changes of edit (MENU):", err);
					}
				}

				/**
				 * @param {string} listId ID of the changed list
				 * @returns {ListChanges} Changes to the list
				 */
				function getChanges(listId) {
					return {
						listId,
						listName: WINDOW.val("feed_list_name"),
					};
				}


				feed[fcName] = WRAPPING.wrapFunction(
					originalFunction,
					onListSave,
					getChanges,
				);
			},

			/**
			 * @typedef SwitchFunctionDefinition
			 * @property {string} functionName Name of the function in `feed` object
			 * @property {boolean} isSection Is it function to switch to section or not
			 */

			/**
			 * @type {Array<SwitchFunctionDefinition>}
			 */
			[$MANIPULATION_SWITCH_FUNCTIONS]: [
				{ functionName: "switchList", isSection: false },
				{ functionName: "switchSection", isSection: true },
			],

			/**
			 * Wraps VK's `feed.switchList` function to reflect changes on tabs
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			wrapSwitchFunctions(tabsList) {
				const { feed } = WINDOW;

				const switchFunctions = MANIPULATION[$MANIPULATION_SWITCH_FUNCTIONS];

				/**
				 * @param {string} tabId ID of the section or list
				 * @param {boolean} isSection Is switch to the section
				 */
				function onSwitchTab(tabId, isSection) {
					try {
						tabId = isSection ? tabId : `list${tabId}`;

						const tab = TABS_LIST.getTabById(tabsList, tabId);

						// If we have to switch to the section which we don't have section
						// for, let's switch to the stub tab, which is just always hidden tab

						if (tab == null) {
							WINDOW.uiTabs.switchTab(
								TABS_LIST.getTabById(tabsList, $MANIPULATION_STUB_TAB),
							);

							return;
						}

						WINDOW.uiTabs.switchTab(tab);

						// BUG: due to that group inherits name of the selected item, it
						// requires us to do a reflow so no elements are out of the list

						// if (tab.parentElement.classList.contains("ui_tab_group_item")) {
						GROUPING.reflowTabs(tabsList);
						// }
					} catch (err) {
						console.error("[TABBY TABS] (!) Failed to reflect tab switch:", err);
					}
				}

				/**
				 * @param {string} tabId ID of the list to switch
				 * @returns {string} ID of the tab
				 */
				function getTabId(tabId) {
					return tabId;
				}

				for (const { functionName, isSection } of switchFunctions) {
					const originalFunction = feed[functionName];

					if (WRAPPING.isWrapped(originalFunction)) return;

					feed[functionName] = WRAPPING.wrapFunction(
						originalFunction,
						(tabId) => onSwitchTab(tabId, isSection),
						getTabId,
					);
				}
			},

			// #endregion
		};

		return manipulation;
	})();

	/**
	 * Collection of Tabby Tab general methods
	 */
	const TABBY_TABS = (function tabbyTabsScope() {
		const $TABS_PRE_INIT_SEQUENCE = Symbol("preInitSequence");
		const $TABS_INIT_SEQUENCE = Symbol("tabsInitSequence");

		return {
			/**
			 * Prepends tabs list at the top of the feed
			 *
			 * @param {HTMLDivElement} feedBlock Central feed block
			 * @param {HTMLUListElement} tabsList Tabs list element
			 */
			prependTabsList(feedBlock, tabsList) {
				const wrap = TABS_LIST.wrapTabsList(tabsList);

				feedBlock.prepend(wrap);
			},

			/**
			 * @callback TabListInitSequence
			 * @param {HTMLUListElement} tabList Tab list element
			 */

			/**
			 * @type {Array<TabListInitSequence>}
			 */
			[$TABS_PRE_INIT_SEQUENCE]: [
				SECRET_TABS.initSecretTabs,
				MANIPULATION.moveListsButton,
				MANIPULATION.addFancyTogglers.bind(MANIPULATION),
				MANIPULATION.moveNews,
				MANIPULATION.addTabsSlider,
			],

			/**
			 * @type {Array<TabListInitSequence>}
			 */
			[$TABS_INIT_SEQUENCE]: [
				MANIPULATION.createStubTab,
				MANIPULATION.wrapSwitchFunctions,
				MANIPULATION.wrapEditFunction,
				MANIPULATION.recreateTabs,
				GROUPING.addMoreGroup,
				GROUPING.reflowTabs.bind(GROUPING),
			],

			/**
			 * Injects required code into VK API in order for script to work
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			injectVKAPIs(tabsList) { // Toggler needs to be modified so it will affect real tabs
				const { feed } = WINDOW;

				const defaultToggler = feed.toggleTabsMenuTab;

				/**
				 * Modified toggler to call modifiaction
				 *
				 * @type {TabToggleFallback}
				 */
				function modifiedToggler(section, state) {
					MANIPULATION.toggleTab(tabsList, section, state, defaultToggler);
				}

				feed.toggleTabsMenuTab = modifiedToggler;
			},

			/**
			 * Pre-initializes Tabby tabs before the feed itself is initialized
			 *
			 * @returns {HTMLUListElement} Tabs list
			 */
			preInit() {
				const feedBlock = TARGETS.getFeedBlock();

				if (feedBlock == null) {
					console.info("[TABBY TABS] This does not seem to be feed page, as there is no feedBlock to manipulate on... Why are we called then?");

					return null;
				}

				const tabsList = TABS_LIST.createTabsList();

				tabsList.classList.add("tabby_tabs");

				this.prependTabsList(feedBlock, tabsList);

				UTIL.runSequenceOn(tabsList, this[$TABS_PRE_INIT_SEQUENCE]);

				return tabsList;
			},

			/**
			 * Initializes Tabby tabs after feed in initialized
			 *
			 * @param {HTMLUListElement} tabsList Tabs list
			 */
			async init(tabsList) {
				UTIL.runSequenceOn(tabsList, this[$TABS_INIT_SEQUENCE]);

				this.injectVKAPIs(tabsList);
			},

			/**
			 * Initializes all needed styles
			 */
			initStyles() {
				STYLES.addStyle(
					"Fix Explicit Group Item Height",
					`.tabby_tabs .ui_tab_wrapper.ui_tab_group_item {
						height: unset;
					}`,
				);

				STYLES.addStyle(
					"Fix Labels Sizings",
					`span.ui_tab_group_label,
					.ui_tab span {
						max-width: 150px;
						white-space: nowrap;
						text-overflow: ellipsis;
						overflow: hidden;
						vertical-align: top;
						display: inline-block;
					}`,
				);

				STYLES.addStyle(
					"Add Own Hidding",
					`.${HIDE_CLASS_NAME} {
						display: none !important;
					}`,
				);

				STYLES.addStyle(
					"Visual fixes",
					`.tabby_tabs .ui_actions_menu_icons {
						background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%2395AEC8' d='M5.186 2.953c.386-.216.8-.39 1.235-.512L6.823.193c.012-.07.023-.095.04-.12A.16.16 0 0 1 6.929.02C6.956.006 6.982 0 7.053 0h1.894c.071 0 .097.006.124.019a.16.16 0 0 1 .066.055c.017.024.028.048.04.119L9.58 2.44c.435.123.849.296 1.235.512l1.874-1.306c.059-.04.084-.05.113-.056a.16.16 0 0 1 .085.008c.028.01.05.024.101.074l1.34 1.34c.05.05.064.073.074.1a.16.16 0 0 1 .008.086c-.005.03-.015.054-.056.113l-1.306 1.874c.216.386.39.8.512 1.235l2.248.402c.07.012.095.023.12.04a.16.16 0 0 1 .054.066c.013.027.019.053.019.124v1.894c0 .071-.006.097-.019.124a.16.16 0 0 1-.055.066c-.024.017-.048.028-.119.04l-2.248.402c-.123.435-.296.849-.512 1.235l1.306 1.874c.04.059.05.084.056.113a.16.16 0 0 1-.008.085c-.01.028-.024.05-.074.101l-1.34 1.34c-.05.05-.073.064-.1.074a.16.16 0 0 1-.086.008c-.03-.005-.054-.015-.113-.056l-1.874-1.306c-.386.216-.8.39-1.235.512l-.402 2.248c-.012.07-.023.095-.04.12a.16.16 0 0 1-.066.054c-.027.013-.053.019-.124.019H7.053c-.071 0-.097-.006-.124-.019a.16.16 0 0 1-.066-.055c-.017-.024-.028-.048-.04-.119L6.42 13.56a5.742 5.742 0 0 1-1.235-.512l-1.874 1.306c-.059.04-.084.05-.113.056a.16.16 0 0 1-.085-.008c-.028-.01-.05-.024-.101-.074l-1.34-1.34c-.05-.05-.064-.073-.074-.1a.16.16 0 0 1-.008-.086c.005-.03.015-.054.056-.113l1.306-1.874A5.742 5.742 0 0 1 2.44 9.58L.193 9.177c-.07-.012-.095-.023-.12-.04a.16.16 0 0 1-.054-.066C.006 9.044 0 9.018 0 8.947V7.053c0-.071.006-.097.019-.124a.16.16 0 0 1 .055-.066c.024-.017.048-.028.119-.04L2.44 6.42c.123-.435.296-.849.512-1.235L1.647 3.312c-.04-.059-.05-.084-.056-.113a.16.16 0 0 1 .008-.085c.01-.028.024-.05.074-.101l1.34-1.34c.05-.05.073-.064.1-.074A.16.16 0 0 1 3.2 1.59c.03.005.054.015.113.056l1.874 1.306zM8 10.667a2.667 2.667 0 1 0 0-5.334 2.667 2.667 0 0 0 0 5.334z'/%3E%3C/svg%3E") 50% / 80% no-repeat !important;
						transform: rotate(0deg);
						transition: transform .45s, opacity .25s !important;
					}`,
					`.feed_filter_icon {
						transition: .25s;
					}`,
					`.tabby_tabs .ui_actions_menu_icons:hover,
					.feed_filter_icon:hover {
						opacity: .9;
					}`,
					`.feed_filter_icon:active {
						opacity: 1;
					}`,
					`.tabby_tabs .shown .ui_actions_menu_icons {
						opacity: 1;
						transform: rotate(90deg);
					}`,
				);

				STYLES.addStyle(
					"Styles of secret tabs",
					`.tabby_secrets .tabby_secret {
						display: none;
					}`,
					`.tabby_secret {
						text-shadow: 0 0 3px #ff05054f;
					}`,
				);

				STYLES.addStyle(
					// https://stackoverflow.com/a/26032207
					"Screenreader Only Elements",
					`.tabby_tabs_sro {
						position: absolute !important;
						height: 1px; width: 1px;
						overflow: hidden;
						clip: rect(1px 1px 1px 1px);
						clip: rect(1px, 1px, 1px, 1px);
					}`,
				);
			},

			/**
			 * Wraps all needed VK objects
			 */
			wrapVKObjects() {
				let currentTabsList;

				WRAPPING.wrapProperty("Stories", (stories) => {
					if (WRAPPING.isWrapped(stories.initFeed)) return;

					stories.initFeed = WRAPPING.wrapFunction(
						stories.initFeed,
						(result) => {
							currentTabsList = result;
						},
						() => TABBY_TABS.preInit(),
					);
				});

				WRAPPING.wrapProperty("feed", (feed) => {
					if (WRAPPING.isWrapped(feed.init)) return;

					feed.init = WRAPPING.wrapFunction(
						feed.init,
						(tabsList) => TABBY_TABS.init(tabsList),
						() => {
							if (currentTabsList) return currentTabsList;

							console.warn("[TABS LIST] Tabs list was not pre-initialized. Is Stories object not wrapped?");

							return TABBY_TABS.preInit();
						},
					);
				});
			},

			/**
			 * Sets up VK List Add integration
			 */
			vkListAddIntegration() {
				/**
				 * Whatever happens when VK List Add list is ready
				 *
				 * @param {CustomEvent} e List ready event
				 */
				function onListReady(e) {
					const { container, rows } = e.detail;

					const secretTabsSet = SECRET_TABS.getSecretTabsSet(container);

					for (const row of rows) {
						SECRET_TABS.checkIsSecretListRow(row, secretTabsSet);
					}

					SECRET_TABS.prepareContainer(container);
				}

				document.addEventListener("vklistadd_list_ready", onListReady);

				SECRET_TABS.initSecretListCSS();
			},

			/**
			 * Bootstraps userscipt
			 */
			bootstrap() {
				this.initStyles();

				this.wrapVKObjects();

				this.vkListAddIntegration();
			},
		};
	})();

	TABBY_TABS.bootstrap();
})();
