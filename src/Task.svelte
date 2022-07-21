<script>
  import { toDoList } from './stores.js';
  import SubTask from './SubTask.svelte';

  export let taskDate;
  export let task;
  export let subTasksList;
  export let idx;
  let list;
  let newSubTask;
  let ifSubTask = false;

  toDoList.subscribe(arr => {
        list = arr;
  })

  function deleteTask(idx) {
    toDoList.update (() => list.slice(0,idx).concat(list.slice(idx+1,list.length)))
  }

  function addSubTask(subTask, idx) {
    ifSubTask = true;
    list[idx].subTasksList.push(subTask);
    toDoList.update(() => [...list]);
  }

</script>

<li {idx}>{taskDate}: {task}
  <button on:click={deleteTask(idx)}>Delete</button>
  <input type="text" placeholder="Insert SubTask" name ="subTask Input" bind:value={newSubTask}/>
  <button on:click={addSubTask(newSubTask, idx)}>Add Subtask</button>
  <ul>
    {#if ifSubTask}
    {#each subTasksList as subtask, sidx}
        <SubTask
        subtask = {subtask}
        sidx = {sidx}
        idx = {idx}
        />
    {/each}
    {/if}
</ul>
</li>

