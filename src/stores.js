import { writable } from 'svelte/store'

export const toDoList = writable([{date: '9/20/2022', task:"apply to job"}]);
export const playerData = writable([]);
export const count = writable(0);