
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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

    /* src/Task.svelte generated by Svelte v3.49.0 */

    function create_fragment$2(ctx) {
    	let li;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			li = element("li");
    			t0 = text(/*taskDate*/ ctx[0]);
    			t1 = text(": ");
    			t2 = text(/*task*/ ctx[1]);
    			t3 = space();
    			button = element("button");
    			button.textContent = "Delete";
    			attr(li, "idx", /*idx*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, t0);
    			append(li, t1);
    			append(li, t2);
    			append(li, t3);
    			append(li, button);

    			if (!mounted) {
    				dispose = listen(button, "click", function () {
    					if (is_function(/*deleteTask*/ ctx[3](/*idx*/ ctx[2]))) /*deleteTask*/ ctx[3](/*idx*/ ctx[2]).apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*taskDate*/ 1) set_data(t0, /*taskDate*/ ctx[0]);
    			if (dirty & /*task*/ 2) set_data(t2, /*task*/ ctx[1]);

    			if (dirty & /*idx*/ 4) {
    				attr(li, "idx", /*idx*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(li);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
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

    	$$self.$$set = $$props => {
    		if ('taskDate' in $$props) $$invalidate(0, taskDate = $$props.taskDate);
    		if ('task' in $$props) $$invalidate(1, task = $$props.task);
    		if ('idx' in $$props) $$invalidate(2, idx = $$props.idx);
    	};

    	return [taskDate, task, idx, deleteTask];
    }

    class Task extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { taskDate: 0, task: 1, idx: 2 });
    	}
    }

    /* src/Stats.svelte generated by Svelte v3.49.0 */

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

    	return {
    		c() {
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
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, ul);
    			append(ul, li0);
    			append(li0, t0);
    			append(li0, t1);
    			append(ul, t2);
    			append(ul, li1);
    			append(li1, t3);
    			append(li1, t4);
    			append(ul, t5);
    			append(ul, li2);
    			append(li2, t6);
    			append(li2, t7);
    			append(ul, t8);
    			append(ul, li3);
    			append(li3, t9);
    			append(li3, t10);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*firstName*/ 1) set_data(t1, /*firstName*/ ctx[0]);
    			if (dirty & /*lastName*/ 2) set_data(t4, /*lastName*/ ctx[1]);
    			if (dirty & /*team*/ 4) set_data(t7, /*team*/ ctx[2]);
    			if (dirty & /*position*/ 8) set_data(t10, /*position*/ ctx[3]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { firstName } = $$props;
    	let { lastName } = $$props;
    	let { team } = $$props;
    	let { position } = $$props;

    	$$self.$$set = $$props => {
    		if ('firstName' in $$props) $$invalidate(0, firstName = $$props.firstName);
    		if ('lastName' in $$props) $$invalidate(1, lastName = $$props.lastName);
    		if ('team' in $$props) $$invalidate(2, team = $$props.team);
    		if ('position' in $$props) $$invalidate(3, position = $$props.position);
    	};

    	return [firstName, lastName, team, position];
    }

    class Stats extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			firstName: 0,
    			lastName: 1,
    			team: 2,
    			position: 3
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.49.0 */

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

    // (85:4) {#each list as task, idx}
    function create_each_block_1(ctx) {
    	let task;
    	let current;

    	task = new Task({
    			props: {
    				taskDate: /*task*/ ctx[18].date,
    				task: /*task*/ ctx[18].task,
    				idx: /*idx*/ ctx[17]
    			}
    		});

    	return {
    		c() {
    			create_component(task.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(task, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const task_changes = {};
    			if (dirty & /*list*/ 4) task_changes.taskDate = /*task*/ ctx[18].date;
    			if (dirty & /*list*/ 4) task_changes.task = /*task*/ ctx[18].task;
    			task.$set(task_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(task.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(task.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(task, detaching);
    		}
    	};
    }

    // (100:4) {#each playerList as player, idx}
    function create_each_block(ctx) {
    	let stats;
    	let current;

    	stats = new Stats({
    			props: {
    				firstName: /*playerList*/ ctx[5][/*idx*/ ctx[17]].firstName,
    				lastName: /*playerList*/ ctx[5][/*idx*/ ctx[17]].lastName,
    				team: /*playerList*/ ctx[5][/*idx*/ ctx[17]].team,
    				position: /*playerList*/ ctx[5][/*idx*/ ctx[17]].position
    			}
    		});

    	return {
    		c() {
    			create_component(stats.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(stats, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const stats_changes = {};
    			if (dirty & /*playerList*/ 32) stats_changes.firstName = /*playerList*/ ctx[5][/*idx*/ ctx[17]].firstName;
    			if (dirty & /*playerList*/ 32) stats_changes.lastName = /*playerList*/ ctx[5][/*idx*/ ctx[17]].lastName;
    			if (dirty & /*playerList*/ 32) stats_changes.team = /*playerList*/ ctx[5][/*idx*/ ctx[17]].team;
    			if (dirty & /*playerList*/ 32) stats_changes.position = /*playerList*/ ctx[5][/*idx*/ ctx[17]].position;
    			stats.$set(stats_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(stats.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(stats.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(stats, detaching);
    		}
    	};
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
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*playerList*/ ctx[5];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
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

    			attr(input0, "type", "text");
    			attr(input0, "placeholder", "Date");
    			attr(input0, "name", "date");
    			attr(input1, "type", "text");
    			attr(input1, "placeholder", "Task");
    			attr(input1, "name", "task");
    			attr(div1, "class", "listInputs");
    			attr(input2, "type", "text");
    			attr(input2, "placeholder", "playerID");
    			attr(input2, "name", "playerID");
    			attr(div2, "class", "statsinput");
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t0);
    			append(p, t1);
    			append(p, t2);
    			insert(target, t3, anchor);
    			insert(target, div0, anchor);
    			append(div0, t4);
    			append(div0, t5);
    			insert(target, t6, anchor);
    			insert(target, button0, anchor);
    			insert(target, t8, anchor);
    			insert(target, button1, anchor);
    			insert(target, t10, anchor);
    			insert(target, br, anchor);
    			insert(target, t11, anchor);
    			insert(target, hr0, anchor);
    			insert(target, t12, anchor);
    			insert(target, div1, anchor);
    			append(div1, input0);
    			set_input_value(input0, /*newDate*/ ctx[3]);
    			append(div1, t13);
    			append(div1, input1);
    			set_input_value(input1, /*newTask*/ ctx[4]);
    			append(div1, t14);
    			append(div1, button2);
    			insert(target, t16, anchor);
    			insert(target, ul0, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul0, null);
    			}

    			insert(target, t17, anchor);
    			insert(target, hr1, anchor);
    			insert(target, t18, anchor);
    			insert(target, div2, anchor);
    			append(div2, input2);
    			set_input_value(input2, /*newPlayerID*/ ctx[6]);
    			append(div2, t19);
    			append(div2, button3);
    			insert(target, t21, anchor);
    			insert(target, ul1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*increment*/ ctx[7]),
    					listen(button1, "click", /*decrement*/ ctx[8]),
    					listen(input0, "input", /*input0_input_handler*/ ctx[11]),
    					listen(input1, "input", /*input1_input_handler*/ ctx[12]),
    					listen(button2, "click", function () {
    						if (is_function(/*addList*/ ctx[9](/*newDate*/ ctx[3], /*newTask*/ ctx[4]))) /*addList*/ ctx[9](/*newDate*/ ctx[3], /*newTask*/ ctx[4]).apply(this, arguments);
    					}),
    					listen(input2, "input", /*input2_input_handler*/ ctx[13]),
    					listen(button3, "click", function () {
    						if (is_function(/*addPlayer*/ ctx[10](/*newPlayerID*/ ctx[6]))) /*addPlayer*/ ctx[10](/*newPlayerID*/ ctx[6]).apply(this, arguments);
    					})
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (!current || dirty & /*name*/ 1) set_data(t1, /*name*/ ctx[0]);
    			if (!current || dirty & /*countValue*/ 2) set_data(t5, /*countValue*/ ctx[1]);

    			if (dirty & /*newDate*/ 8 && input0.value !== /*newDate*/ ctx[3]) {
    				set_input_value(input0, /*newDate*/ ctx[3]);
    			}

    			if (dirty & /*newTask*/ 16 && input1.value !== /*newTask*/ ctx[4]) {
    				set_input_value(input1, /*newTask*/ ctx[4]);
    			}

    			if (dirty & /*list*/ 4) {
    				each_value_1 = /*list*/ ctx[2];
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
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
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
    		d(detaching) {
    			if (detaching) detach(p);
    			if (detaching) detach(t3);
    			if (detaching) detach(div0);
    			if (detaching) detach(t6);
    			if (detaching) detach(button0);
    			if (detaching) detach(t8);
    			if (detaching) detach(button1);
    			if (detaching) detach(t10);
    			if (detaching) detach(br);
    			if (detaching) detach(t11);
    			if (detaching) detach(hr0);
    			if (detaching) detach(t12);
    			if (detaching) detach(div1);
    			if (detaching) detach(t16);
    			if (detaching) detach(ul0);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach(t17);
    			if (detaching) detach(hr1);
    			if (detaching) detach(t18);
    			if (detaching) detach(div2);
    			if (detaching) detach(t21);
    			if (detaching) detach(ul1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
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

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

})();
