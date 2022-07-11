<script>
  import { toDoList } from './stores.js';
  export let taskDate;
  export let task;
  export let idx;
  
  let list;

  toDoList.subscribe(arr => {
        list = arr;
    })

  function deleteTask(idx) {
        toDoList.update (() => list.slice(0,idx).concat(list.slice(idx+1,list.length)))
  }

</script>

<li {idx}>{taskDate}: {task} <button on:click={deleteTask(idx)}>Delete</button></li>
    

