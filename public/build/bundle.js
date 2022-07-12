
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.49.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function dataset_dev(node, property, value) {
        node.dataset[property] = value;
        dispatch_dev('SvelteDOMSetDataset', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const toDoList = writable([{date: '9/20/2022', task:"apply to job"}]);
    const playerData = writable([]);
    const count = writable(0);
    // Object {
    //     set: value,
    //     subscribe: f(n),
    //     update: f(n),
    // }

    /* src/Task.svelte generated by Svelte v3.49.0 */
    const file$2 = "src/Task.svelte";

    function create_fragment$2(ctx) {
    	let li;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(/*taskDate*/ ctx[0]);
    			t1 = text(": ");
    			t2 = text(/*task*/ ctx[1]);
    			t3 = space();
    			button = element("button");
    			button.textContent = "Delete";
    			add_location(button, file$2, 18, 29, 347);
    			attr_dev(li, "idx", /*idx*/ ctx[2]);
    			add_location(li, file$2, 18, 0, 318);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    			append_dev(li, t3);
    			append_dev(li, button);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*deleteTask*/ ctx[3](/*idx*/ ctx[2]))) /*deleteTask*/ ctx[3](/*idx*/ ctx[2]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*taskDate*/ 1) set_data_dev(t0, /*taskDate*/ ctx[0]);
    			if (dirty & /*task*/ 2) set_data_dev(t2, /*task*/ ctx[1]);

    			if (dirty & /*idx*/ 4) {
    				attr_dev(li, "idx", /*idx*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Task', slots, []);
    	let { taskDate } = $$props;
    	let { task } = $$props;
    	let { idx } = $$props;
    	let list;

    	toDoList.subscribe(arr => {
    		list = arr;
    	});

    	function deleteTask(idx) {
    		toDoList.update(() => list.slice(0, idx).concat(list.slice(idx + 1, list.length)));
    	}

    	const writable_props = ['taskDate', 'task', 'idx'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Task> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('taskDate' in $$props) $$invalidate(0, taskDate = $$props.taskDate);
    		if ('task' in $$props) $$invalidate(1, task = $$props.task);
    		if ('idx' in $$props) $$invalidate(2, idx = $$props.idx);
    	};

    	$$self.$capture_state = () => ({
    		toDoList,
    		taskDate,
    		task,
    		idx,
    		list,
    		deleteTask
    	});

    	$$self.$inject_state = $$props => {
    		if ('taskDate' in $$props) $$invalidate(0, taskDate = $$props.taskDate);
    		if ('task' in $$props) $$invalidate(1, task = $$props.task);
    		if ('idx' in $$props) $$invalidate(2, idx = $$props.idx);
    		if ('list' in $$props) list = $$props.list;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [taskDate, task, idx, deleteTask];
    }

    class Task extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { taskDate: 0, task: 1, idx: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Task",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*taskDate*/ ctx[0] === undefined && !('taskDate' in props)) {
    			console.warn("<Task> was created without expected prop 'taskDate'");
    		}

    		if (/*task*/ ctx[1] === undefined && !('task' in props)) {
    			console.warn("<Task> was created without expected prop 'task'");
    		}

    		if (/*idx*/ ctx[2] === undefined && !('idx' in props)) {
    			console.warn("<Task> was created without expected prop 'idx'");
    		}
    	}

    	get taskDate() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set taskDate(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get task() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set task(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get idx() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set idx(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Stats.svelte generated by Svelte v3.49.0 */

    const file$1 = "src/Stats.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let ul;
    	let li0;
    	let t0;
    	let t1;
    	let t2;
    	let li1;
    	let t3;
    	let t4;
    	let t5;
    	let li2;
    	let t6;
    	let t7;
    	let t8;
    	let li3;
    	let t9;
    	let t10;

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			t0 = text("First Name: ");
    			t1 = text(/*firstName*/ ctx[0]);
    			t2 = space();
    			li1 = element("li");
    			t3 = text("Last Name: ");
    			t4 = text(/*lastName*/ ctx[1]);
    			t5 = space();
    			li2 = element("li");
    			t6 = text("Team Name: ");
    			t7 = text(/*team*/ ctx[2]);
    			t8 = space();
    			li3 = element("li");
    			t9 = text("Position: ");
    			t10 = text(/*position*/ ctx[3]);
    			add_location(li0, file$1, 9, 8, 141);
    			add_location(li1, file$1, 10, 8, 182);
    			add_location(li2, file$1, 11, 8, 221);
    			add_location(li3, file$1, 12, 8, 259);
    			add_location(ul, file$1, 8, 4, 128);
    			add_location(div, file$1, 7, 0, 117);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);
    			append_dev(ul, li0);
    			append_dev(li0, t0);
    			append_dev(li0, t1);
    			append_dev(ul, t2);
    			append_dev(ul, li1);
    			append_dev(li1, t3);
    			append_dev(li1, t4);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    			append_dev(li2, t6);
    			append_dev(li2, t7);
    			append_dev(ul, t8);
    			append_dev(ul, li3);
    			append_dev(li3, t9);
    			append_dev(li3, t10);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*firstName*/ 1) set_data_dev(t1, /*firstName*/ ctx[0]);
    			if (dirty & /*lastName*/ 2) set_data_dev(t4, /*lastName*/ ctx[1]);
    			if (dirty & /*team*/ 4) set_data_dev(t7, /*team*/ ctx[2]);
    			if (dirty & /*position*/ 8) set_data_dev(t10, /*position*/ ctx[3]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Stats', slots, []);
    	let { firstName } = $$props;
    	let { lastName } = $$props;
    	let { team } = $$props;
    	let { position } = $$props;
    	const writable_props = ['firstName', 'lastName', 'team', 'position'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Stats> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('firstName' in $$props) $$invalidate(0, firstName = $$props.firstName);
    		if ('lastName' in $$props) $$invalidate(1, lastName = $$props.lastName);
    		if ('team' in $$props) $$invalidate(2, team = $$props.team);
    		if ('position' in $$props) $$invalidate(3, position = $$props.position);
    	};

    	$$self.$capture_state = () => ({ firstName, lastName, team, position });

    	$$self.$inject_state = $$props => {
    		if ('firstName' in $$props) $$invalidate(0, firstName = $$props.firstName);
    		if ('lastName' in $$props) $$invalidate(1, lastName = $$props.lastName);
    		if ('team' in $$props) $$invalidate(2, team = $$props.team);
    		if ('position' in $$props) $$invalidate(3, position = $$props.position);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [firstName, lastName, team, position];
    }

    class Stats extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			firstName: 0,
    			lastName: 1,
    			team: 2,
    			position: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Stats",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*firstName*/ ctx[0] === undefined && !('firstName' in props)) {
    			console.warn("<Stats> was created without expected prop 'firstName'");
    		}

    		if (/*lastName*/ ctx[1] === undefined && !('lastName' in props)) {
    			console.warn("<Stats> was created without expected prop 'lastName'");
    		}

    		if (/*team*/ ctx[2] === undefined && !('team' in props)) {
    			console.warn("<Stats> was created without expected prop 'team'");
    		}

    		if (/*position*/ ctx[3] === undefined && !('position' in props)) {
    			console.warn("<Stats> was created without expected prop 'position'");
    		}
    	}

    	get firstName() {
    		throw new Error("<Stats>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set firstName(value) {
    		throw new Error("<Stats>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lastName() {
    		throw new Error("<Stats>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lastName(value) {
    		throw new Error("<Stats>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get team() {
    		throw new Error("<Stats>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set team(value) {
    		throw new Error("<Stats>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get position() {
    		throw new Error("<Stats>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set position(value) {
    		throw new Error("<Stats>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.49.0 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    // (83:4) {#each list as task, idx}
    function create_each_block_1(ctx) {
    	let task;
    	let current;

    	task = new Task({
    			props: {
    				taskDate: /*task*/ ctx[18].date,
    				task: /*task*/ ctx[18].task,
    				idx: /*idx*/ ctx[17]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(task.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(task, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const task_changes = {};
    			if (dirty & /*list*/ 4) task_changes.taskDate = /*task*/ ctx[18].date;
    			if (dirty & /*list*/ 4) task_changes.task = /*task*/ ctx[18].task;
    			task.$set(task_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(task.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(task.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(task, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(83:4) {#each list as task, idx}",
    		ctx
    	});

    	return block;
    }

    // (98:4) {#each playerList as player, idx}
    function create_each_block(ctx) {
    	let stats;
    	let current;

    	stats = new Stats({
    			props: {
    				firstName: /*playerList*/ ctx[5][/*idx*/ ctx[17]].firstName,
    				lastName: /*playerList*/ ctx[5][/*idx*/ ctx[17]].lastName,
    				team: /*playerList*/ ctx[5][/*idx*/ ctx[17]].team,
    				position: /*playerList*/ ctx[5][/*idx*/ ctx[17]].position
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(stats.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(stats, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const stats_changes = {};
    			if (dirty & /*playerList*/ 32) stats_changes.firstName = /*playerList*/ ctx[5][/*idx*/ ctx[17]].firstName;
    			if (dirty & /*playerList*/ 32) stats_changes.lastName = /*playerList*/ ctx[5][/*idx*/ ctx[17]].lastName;
    			if (dirty & /*playerList*/ 32) stats_changes.team = /*playerList*/ ctx[5][/*idx*/ ctx[17]].team;
    			if (dirty & /*playerList*/ 32) stats_changes.position = /*playerList*/ ctx[5][/*idx*/ ctx[17]].position;
    			stats.$set(stats_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(stats.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(stats.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(stats, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(98:4) {#each playerList as player, idx}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let div0;
    	let t4;
    	let t5;
    	let t6;
    	let button0;
    	let t8;
    	let button1;
    	let t10;
    	let br;
    	let t11;
    	let hr0;
    	let t12;
    	let div1;
    	let input0;
    	let t13;
    	let input1;
    	let t14;
    	let button2;
    	let t16;
    	let ul0;
    	let t17;
    	let hr1;
    	let t18;
    	let div2;
    	let input2;
    	let t19;
    	let button3;
    	let t21;
    	let ul1;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*list*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*playerList*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Hello ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text(" !!!!!!");
    			t3 = space();
    			div0 = element("div");
    			t4 = text("The count is ");
    			t5 = text(/*countValue*/ ctx[1]);
    			t6 = space();
    			button0 = element("button");
    			button0.textContent = "+";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "-";
    			t10 = space();
    			br = element("br");
    			t11 = space();
    			hr0 = element("hr");
    			t12 = space();
    			div1 = element("div");
    			input0 = element("input");
    			t13 = space();
    			input1 = element("input");
    			t14 = space();
    			button2 = element("button");
    			button2.textContent = "Submit";
    			t16 = space();
    			ul0 = element("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t17 = space();
    			hr1 = element("hr");
    			t18 = space();
    			div2 = element("div");
    			input2 = element("input");
    			t19 = space();
    			button3 = element("button");
    			button3.textContent = "Add Player";
    			t21 = space();
    			ul1 = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(p, file, 69, 0, 1413);
    			add_location(div0, file, 70, 0, 1440);
    			add_location(button0, file, 71, 0, 1477);
    			add_location(button1, file, 72, 0, 1517);
    			add_location(br, file, 73, 0, 1557);
    			add_location(hr0, file, 74, 0, 1562);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Date");
    			attr_dev(input0, "name", "date");
    			add_location(input0, file, 77, 4, 1597);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "Task");
    			attr_dev(input1, "name", "task");
    			add_location(input1, file, 78, 4, 1674);
    			add_location(button2, file, 79, 4, 1751);
    			attr_dev(div1, "class", "listInputs");
    			add_location(div1, file, 76, 0, 1568);
    			add_location(ul0, file, 81, 0, 1819);
    			add_location(hr1, file, 90, 0, 1978);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "playerID");
    			attr_dev(input2, "name", "playerID");
    			add_location(input2, file, 93, 4, 2013);
    			add_location(button3, file, 94, 4, 2103);
    			attr_dev(div2, "class", "statsinput");
    			add_location(div2, file, 92, 0, 1984);
    			add_location(ul1, file, 96, 0, 2172);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t4);
    			append_dev(div0, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, hr0, anchor);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, input0);
    			set_input_value(input0, /*newDate*/ ctx[3]);
    			append_dev(div1, t13);
    			append_dev(div1, input1);
    			set_input_value(input1, /*newTask*/ ctx[4]);
    			append_dev(div1, t14);
    			append_dev(div1, button2);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, ul0, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul0, null);
    			}

    			insert_dev(target, t17, anchor);
    			insert_dev(target, hr1, anchor);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, input2);
    			set_input_value(input2, /*newPlayerID*/ ctx[6]);
    			append_dev(div2, t19);
    			append_dev(div2, button3);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, ul1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*increment*/ ctx[7], false, false, false),
    					listen_dev(button1, "click", /*decrement*/ ctx[8], false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[11]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[12]),
    					listen_dev(
    						button2,
    						"click",
    						function () {
    							if (is_function(/*addList*/ ctx[9](/*newDate*/ ctx[3], /*newTask*/ ctx[4]))) /*addList*/ ctx[9](/*newDate*/ ctx[3], /*newTask*/ ctx[4]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[13]),
    					listen_dev(
    						button3,
    						"click",
    						function () {
    							if (is_function(/*addPlayer*/ ctx[10](/*newPlayerID*/ ctx[6]))) /*addPlayer*/ ctx[10](/*newPlayerID*/ ctx[6]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (!current || dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    			if (!current || dirty & /*countValue*/ 2) set_data_dev(t5, /*countValue*/ ctx[1]);

    			if (dirty & /*newDate*/ 8 && input0.value !== /*newDate*/ ctx[3]) {
    				set_input_value(input0, /*newDate*/ ctx[3]);
    			}

    			if (dirty & /*newTask*/ 16 && input1.value !== /*newTask*/ ctx[4]) {
    				set_input_value(input1, /*newTask*/ ctx[4]);
    			}

    			if (dirty & /*list*/ 4) {
    				each_value_1 = /*list*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(ul0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*newPlayerID*/ 64 && input2.value !== /*newPlayerID*/ ctx[6]) {
    				set_input_value(input2, /*newPlayerID*/ ctx[6]);
    			}

    			if (dirty & /*playerList*/ 32) {
    				each_value = /*playerList*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(hr0);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(ul0);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(hr1);
    			if (detaching) detach_dev(t18);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t21);
    			if (detaching) detach_dev(ul1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name } = $$props;
    	let countValue;
    	let list;
    	let newDate;
    	let newTask;
    	let playerList;
    	let newPlayerID;
    	let data;

    	playerData.subscribe(arr => {
    		$$invalidate(5, playerList = arr);
    	});

    	toDoList.subscribe(arr => {
    		$$invalidate(2, list = arr);
    	});

    	count.subscribe(value => {
    		$$invalidate(1, countValue = value);
    	});

    	function increment() {
    		count.update(n => n + 1);
    	}

    	function decrement() {
    		count.update(n => n - 1);
    	}

    	function addList(date, task) {
    		toDoList.update(() => [...list, { date, task }]);
    	}

    	async function addPlayer(id) {
    		await fetch(`https://www.balldontlie.io/api/v1/players/${id}`).then(res => res.json()).then(res => {
    			data = res;
    		});

    		// https://www.balldontlie.io/api/v1/players/<ID>
    		playerData.update(() => [
    			...playerList,
    			{
    				firstName: data.first_name,
    				lastName: data.last_name,
    				team: data.team.full_name,
    				position: data.position
    			}
    		]);

    		console.log(playerList);
    	}

    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		newDate = this.value;
    		$$invalidate(3, newDate);
    	}

    	function input1_input_handler() {
    		newTask = this.value;
    		$$invalidate(4, newTask);
    	}

    	function input2_input_handler() {
    		newPlayerID = this.value;
    		$$invalidate(6, newPlayerID);
    	}

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		count,
    		toDoList,
    		playerData,
    		Task,
    		Stats,
    		dataset_dev,
    		name,
    		countValue,
    		list,
    		newDate,
    		newTask,
    		playerList,
    		newPlayerID,
    		data,
    		increment,
    		decrement,
    		addList,
    		addPlayer
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('countValue' in $$props) $$invalidate(1, countValue = $$props.countValue);
    		if ('list' in $$props) $$invalidate(2, list = $$props.list);
    		if ('newDate' in $$props) $$invalidate(3, newDate = $$props.newDate);
    		if ('newTask' in $$props) $$invalidate(4, newTask = $$props.newTask);
    		if ('playerList' in $$props) $$invalidate(5, playerList = $$props.playerList);
    		if ('newPlayerID' in $$props) $$invalidate(6, newPlayerID = $$props.newPlayerID);
    		if ('data' in $$props) data = $$props.data;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		countValue,
    		list,
    		newDate,
    		newTask,
    		playerList,
    		newPlayerID,
    		increment,
    		decrement,
    		addList,
    		addPlayer,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console_1.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
        target: document.getElementById('root'),
        props: {
            name: 'world'
        }
    });

    return app;

})();
