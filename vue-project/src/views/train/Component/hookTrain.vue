<script setup>
  import {ref, onMounted, onUnmounted} from 'vue';

onMounted(() => {
  console.log('  Đổi tiêu đề tab nào.');
  document.title = "Đang làm bài tập Vue 3";
});

onUnmounted(() => {
  console.log(' Trả lại tiêu đề tab');
});
</script>


  <template>
  <div class="child-box">
    <h3>alo 113 xin nghe!</h3>
   <b>Đang làm bài tập Vue 3</b>
  </div>
</template>

