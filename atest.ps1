# Define the path to your Node.js project
$projectPath = "E:\JavaProjects\JSImageEdit"

# Define the strings for search and replace
$searchString = "JSImageEdit"
$replaceString = "JSImageEdit"

# Function to rename directories
Function Rename-Directories {
    param (
        [string]$path
    )

    # Get all directories in the path, excluding the root
    $directories = Get-ChildItem -Path $path -Recurse -Directory | Sort-Object FullName -Descending

    foreach ($dir in $directories) {
        $newName = $dir.Name -replace $searchString, $replaceString
        if ($newName -ne $dir.Name) {
            $newPath = Join-Path $dir.Parent.FullName $newName
            Rename-Item -Path $dir.FullName -NewName $newPath
        }
    }
}

# Rename directories
Rename-Directories -path $projectPath

# Rename files
Get-ChildItem -Path $projectPath -Recurse -File | ForEach-Object {
    # Read the content of the file
    $content = Get-Content $_.FullName

    # Replace the string
    $content = $content -replace $searchString, $replaceString

    # Write the content back to the file
    Set-Content -Path $_.FullName -Value $content
}

# Output completion message
Write-Host "String replacement and renaming complete."
