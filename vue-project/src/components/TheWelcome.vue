<script setup>
const props = defineProps(['counting']);
const emit = defineEmits(['handle-increase']);

const onIncrease=()=>{
    emit('handle-increase',10);
}
</script>

<template>
<div> Count : {{ props.counting }} </div>
<button @click="onIncrease()">Increase</button>
</template>

