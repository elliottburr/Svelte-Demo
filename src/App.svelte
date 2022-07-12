<script>
    import { count, toDoList, playerData } from './stores.js';
    import Task from './Task.svelte';
    import Stats from './Stats.svelte';
    import { dataset_dev } from 'svelte/internal';
    export let name;

    let countValue;
    let list;
    let newDate;
    let newTask;
    let playerList;
    let newPlayerID;
    let data;
    
    playerData.subscribe(arr => {
        playerList = arr;
    })


    toDoList.subscribe(arr => {
        list = arr;
    })

    count.subscribe(value => {
        countValue = value;
    })
    
    function increment() {
        count.update(n => n + 1)
    }
    
    function decrement() {
        count.update(n => n - 1)
    }
    
    function addList(date, task){
        toDoList.update (() => [
            ...list, {
            date: date,
            task: task
            }
        ])
    }

    async function addPlayer(id){

        await fetch(`https://www.balldontlie.io/api/v1/players/${id}`)
        .then(res => res.json())
        .then(res => {
            data = res;
        });

        // https://www.balldontlie.io/api/v1/players/<ID>

        playerData.update (() => [
            ...playerList, {
            firstName: data.first_name,
            lastName: data.last_name,
            team: data.team.full_name,
            position: data.position
            }
        ])

        console.log(playerList)
    }

</script>

<p>Hello {name} !!!!!!</p>
<div>The count is {countValue}</div>
<button on:click={increment}>+</button>
<button on:click={decrement}>-</button>
<br>
<hr>

<div class="listInputs">
    <input type="text" placeholder="Date" name="date" bind:value={newDate}/>
    <input type="text" placeholder="Task" name="task" bind:value={newTask}/>
    <button on:click={addList(newDate, newTask)}>Submit</button>
</div>
<ul>
    {#each list as task, idx}
        <Task 
        taskDate = {task.date} 
        task = {task.task} 
        idx = {idx}
        />
    {/each}
</ul>
<hr>

<div class="statsinput">
    <input type="text" placeholder="playerID" name ="playerID" bind:value={newPlayerID}/>
    <button on:click={addPlayer(newPlayerID)}>Add Player</button>
</div>
<ul>
    {#each playerList as player, idx}
        <Stats 
        firstName = {playerList[idx].firstName}
        lastName = {playerList[idx].lastName}
        team = {playerList[idx].team}
        position= {playerList[idx].position}
        />
    {/each}
</ul>

<style>
  body{
    background-color: white,
  }
</style>
