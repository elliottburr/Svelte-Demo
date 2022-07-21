<script>
    import TeamInfo from './TeamInfo.svelte';
    import { playerData } from './stores.js';
    export let firstName;
    export let lastName;
    export let team;
    export let position;
    export let idx;

    let teamInfoList;
    let ifOpened = false;

    playerData.subscribe(arr => {
        teamInfoList = arr;
    })

    function openTeamInfo(){
        ifOpened = !ifOpened;
    }

</script>

<div> 
    <ul>
        <li>First Name: {firstName}</li>
        <li>Last Name: {lastName}</li>
        <li>Position: {position}</li>
        <li>Team Name: {team}</li>
        <span>
            <button on:click={openTeamInfo}>Team Info</button>
        </span>   
        {#if ifOpened}
            <TeamInfo 
            abbreviation = {teamInfoList[idx].abbreviation} 
            city = {teamInfoList[idx].city}
            conference = {teamInfoList[idx].conference}
            division = {teamInfoList[idx].division}
            />
        {/if}
    </ul>
</div>

