<script>
    import { toDoList } from './stores.js';
    export let subtask;
    export let idx;
    export let sidx;
    let list;

    toDoList.subscribe(arr => {
        list = arr;
    })

    function deleteSubTask(idx, sidx) {
        list[idx].subTasksList.splice(sidx, 1);
        toDoList.update(() => [...list]);
    }

</script>

<li {sidx}>{subtask}
<button on:click={deleteSubTask(idx, sidx)}>Delete</button>
</li>