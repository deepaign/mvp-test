import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  transcript: string
}

interface ExtractedData {
  "Reception Time": string
  "Petition Method": string
  "Case Category": string
  "Petitioner's Home Address": string
  "Priority Level": string
  "Petitioner's Name": string
  "Contact Phone Number": string
  "Second Petitioner's Chinese Name": string
  "Second Petitioner's Contact Phone": string
  "Incident Location": string
  "Petition Summary": string
}

interface ResponseData {
  success: boolean
  extractedData?: ExtractedData
  error?: string
  processingTime?: number
}

serve(async (req) => {
  // 處理 CORS preflight 請求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 記錄請求開始時間
    const startTime = performance.now()
    
    // 驗證請求方法
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: '僅支援 POST 請求' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 解析請求內容
    const { transcript }: RequestBody = await req.json()
    
    // 驗證輸入
    if (!transcript || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: '陳情內容不能為空' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 檢查字數限制（避免過長的請求）
    if (transcript.length > 10000) {
      return new Response(
        JSON.stringify({ success: false, error: '陳情內容過長，請控制在 10,000 字以內' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 初始化 Anthropic 客戶端
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    if (!anthropic.apiKey) {
      console.error('ANTHROPIC_API_KEY 未設定')
      return new Response(
        JSON.stringify({ success: false, error: 'AI 服務設定錯誤' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 構建 AI 提示詞
    const prompt = `You are an experienced administrative assistant tasked with analyzing transcripts of citizen petitions to political figures. Your goal is to extract key information from these transcripts and present it in a structured format for efficient processing. Here is the transcript you need to analyze:

${transcript}

Your task is to carefully read the above transcript and extract the following key information:

1. Reception Time
2. Petition Method (choose from: Line, 電話, 現場, FB, Email, 其他)
3. Case Category (choose from: Public Services, Legal Consultation, Traffic Issues, Environmental Issues, Public Safety Issues, Other Issues)
4. Petitioner's Home Address (in Chinese)
5. Priority Level (choose from: Urgent, Normal, Low)
6. Petitioner's Chinese Name
7. Contact Phone Number
8. Second Petitioner's Chinese Name (if applicable)
9. Second Petitioner's Contact Phone (if applicable)
10. Incident Location (in Chinese)
11. Petition Summary (in Chinese with short sentences)
12. Petition Description (in Chinese with whole descriptions to the petition)

Before providing your final answer, wrap your extraction process inside <extraction_process> tags. For each key information item:

1. Quote the relevant part of the transcript (if it exists).
2. Interpret the quoted text to extract the required information.
3. For Case Category and Priority Level, list arguments for each possible option, then make a decision.
4. Clearly indicate if any information is not mentioned in the transcript.
5. Double-check that each piece of information is explicitly mentioned in the transcript.
6. Ensure you select the correct Case Category and Priority Level (if mentioned).

Important: In your extraction process, do not include any explanations or reasoning in your final output. The extraction process is for your own thought process only.

After your extraction process, present your findings in a JSON string format. Use the exact key names listed above (in English). For any information not found in the transcript, use an empty string as the value.

Here's an example of how your output should be structured:

{
  "Reception Time": "",
  "Petition Method": "電話",
  "Case Category": "Traffic Issues",
  "Petitioner's Home Address": "台北市大安區辛亥路二段171巷6弄10號",
  "Priority Level": "Normal",
  "Petitioner's Name": "王曉明",
  "Contact Phone Number": "0966456951",
  "Second Petitioner's Chinese Name": "陳大天",
  "Second Petitioner's Contact Phone": "0981491346",
  "Incident Location": "長安東路與復興北路交叉口",
  "Petition Summary": "",
  "Petition Description": ""
}

Remember:
- If the transcript doesn't provide certain information, use an empty string for that field.
- Adhere strictly to the requested format.
- Do not include any additional information or commentary in your output.

Begin your response with your extraction process in <extraction_process> tags, followed by the JSON output.`

    console.log('🚀 開始呼叫 Claude API...')
    
    // 呼叫 Claude API
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      temperature: 0,
      messages: [{
        role: "user",
        content: prompt
      }]
    })

    const responseText = message.content[0].text
    console.log('✅ Claude API 回應成功')

    // 提取 JSON 部分（移除 extraction_process 標籤內容）
    const jsonStart = responseText.lastIndexOf('{')
    const jsonEnd = responseText.lastIndexOf('}') + 1
    
    if (jsonStart === -1 || jsonEnd === 0) {
      console.error('❌ 無法從 AI 回應中提取 JSON')
      return new Response(
        JSON.stringify({ success: false, error: 'AI 回應格式錯誤' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const jsonString = responseText.substring(jsonStart, jsonEnd)
    
    try {
      const extractedData: ExtractedData = JSON.parse(jsonString)
      
      // 記錄處理時間
      const endTime = performance.now()
      const processingTime = Math.round(endTime - startTime)
      
      console.log(`✅ AI 摘要完成，處理時間: ${processingTime}ms`)
      console.log('提取的資料:', extractedData)

      const response: ResponseData = {
        success: true,
        extractedData,
        processingTime
      }

      return new Response(
        JSON.stringify(response),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (parseError) {
      console.error('❌ JSON 解析失敗:', parseError)
      console.error('原始 JSON 字串:', jsonString)
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI 回應解析失敗' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Edge Function 執行錯誤:', error)
    
    // 處理不同類型的錯誤
    let errorMessage = '處理請求時發生錯誤'
    let statusCode = 500
    
    if (error.message?.includes('API key')) {
      errorMessage = 'AI 服務認證失敗'
      statusCode = 401
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'AI 服務使用量超限，請稍後再試'
      statusCode = 429
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'AI 服務回應超時，請稍後再試'
      statusCode = 504
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: error.message 
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
