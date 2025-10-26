import { sendScreenshot } from "./overlay-screen/src/services/apiService.js";
import supabase from "./supabase.js";

export async function runLessons() {
  const { data: lessons } = await supabase.from('lesson').select('*').eq('is_finished', false);
  for (const lesson of lessons) {
    const { data: steps } = await supabase.from('step').select('*').eq('lesson_id', lesson.id);
    for (const step of steps) {
      let complete = false;
      while (!complete) {
        const resp = await sendScreenshot();
        if (resp) {
          complete = true;
        }
      }
    }
    await supabase.from('lesson').update({ is_finished: true }).eq('id', lesson.id);
  }
}