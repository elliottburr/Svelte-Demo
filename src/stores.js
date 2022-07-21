import { writable } from 'svelte/store'

export const toDoList = writable([{date: '9/20/2022', task:"apply to job", subTasksList:["update resume"]}]);
export const playerData = writable([]);
export const count = writable(0);
// Object {
//     set: value,
//     subscribe: f(n),
//     update: f(n),
// }