$headers = @{
  Accept = 'application/json'
  'Content-Type' = 'application/json'
  token = '3a62e51e-9785-4258-8e05-2ee44ee55f84'
}

$body = @{}
$bodyJson = $body | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Uri 'https://oralaligner.uazapi.com/instance/connect' -Method Post -Headers $headers -Body $bodyJson
  $response | ConvertTo-Json -Depth 10
} catch {
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $bodyErr = $reader.ReadToEnd()
    Write-Host $bodyErr
  } else {
    throw
  }
}
