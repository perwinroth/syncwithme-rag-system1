#!/usr/bin/env tsx
/**
 * Monitor upload progress and run comprehensive tests when complete
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { runComprehensiveTests } from './comprehensive-rag-test'

const execAsync = promisify(exec)

async function checkUploadProgress(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('ps aux | grep "final-fix-upload" | grep -v grep')
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

async function monitorAndTest() {
  console.log('📡 Monitoring upload progress...\n')
  
  let isRunning = await checkUploadProgress()
  let lastCheck = Date.now()
  
  if (!isRunning) {
    console.log('✅ Upload already complete or not running')
    console.log('🧪 Starting comprehensive tests immediately...\n')
    await runComprehensiveTests()
    return
  }
  
  console.log('⏳ Upload still in progress. Waiting for completion...')
  console.log('   (Checking every 30 seconds)\n')
  
  while (isRunning) {
    await new Promise(resolve => setTimeout(resolve, 30000)) // Wait 30 seconds
    
    const previousState = isRunning
    isRunning = await checkUploadProgress()
    
    if (isRunning) {
      const elapsed = Math.floor((Date.now() - lastCheck) / 60000)
      console.log(`   Still uploading... (${elapsed} minutes elapsed)`)
    } else if (previousState && !isRunning) {
      console.log('\n✅ Upload completed!')
      console.log('⏳ Waiting 10 seconds for index to stabilize...')
      await new Promise(resolve => setTimeout(resolve, 10000))
      
      console.log('\n🧪 Starting comprehensive test suite...\n')
      const results = await runComprehensiveTests()
      
      // Send notification if possible (terminal bell)
      process.stdout.write('\x07')
      
      console.log('\n🏁 MONITORING COMPLETE')
      console.log(`Final Score: ${results.successRate.toFixed(1)}%`)
      
      if (results.successRate >= 80) {
        console.log('🎉 System is ready for production!')
      }
      
      break
    }
  }
}

if (require.main === module) {
  monitorAndTest().catch(console.error)
}

export { monitorAndTest }