$file = 'src\contexts\LaundryContext.tsx'
$content = Get-Content $file -Raw

# Замена 1: Заменяем все блоки получения JWT на вызов getFreshToken
$pattern1 = '(?s)// ✅ Получаем JWT\s+const \{ data: \{ session \} \} = await supabase\.auth\.getSession\(\);\s+if \(!session\?\.access_token\) \{\s+throw new Error\(''Нет активной сессии''\);\s+\}'
$replacement1 = '// ✅ Получаем свежий JWT
      const access_token = await getFreshToken();'

$content = $content -replace $pattern1, $replacement1

# Замена 2: Заменяем все использования ${session.access_token} на ${access_token}
$content = $content -replace '\$\{session\.access_token\}', '${access_token}'

Set-Content $file -Value $content -NoNewline
Write-Host "Token replacements completed successfully"
