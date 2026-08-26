import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://jmxsozljiqccuffnweyq.supabase.co', 'sb_publishable_EZov8cR1UScU0vHxA-X1UA_tUx1Bd0h')

async function run() {
  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  console.log('Today is', todayStr);
  
  const { data, error } = await supabase.from('attendance').delete().gt('date', todayStr);
  
  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('Successfully deleted future records.');
  }
}

run();
