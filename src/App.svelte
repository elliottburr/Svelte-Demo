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
        console.log("date:", date);
        console.log("task:", task);
        toDoList.update (() => [
            ...list, {
            date: date,
            task: task,
            subTasksList: [],
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
            position: data.position,
            team: data.team.full_name,
            abbreviation: data.team.abbreviation,
            city: data.team.city,
            conference: data.team.conference,
            division: data.team.division
            }
        ])

        console.log('playerlist: ', playerList)
    }

</script>

<body>
<div class="main">
    <div class ="counter">
        <p>Hello {name} !!!!!!</p>
        <div>The count is {countValue}</div>
        <button on:click={increment}>+</button>
        <button on:click={decrement}>-</button>
        <br>
        <!-- <hr> -->
    </div>
    <div class="task">
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
                subTasksList = {task.subTasksList}
                idx = {idx}
                />
            {/each}
        </ul>
        <!-- <hr> -->
    </div>
    <div class ="stats">
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
                position = {playerList[idx].position} 
                idx = {idx}
                />
            {/each}
        </ul>
    </div>
</div>
</body>

<!-- <style>
  .main {
    background-color: rgb(145, 41, 41);
    display: flex;
    flex-direction: column;
    /* justify-content: center; */
    align-items: center;
  }

</style> -->
