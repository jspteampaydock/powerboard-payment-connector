<?php
const RESULT_FILE_PATH = __DIR__ . DIRECTORY_SEPARATOR . 'paydockToPowerboard.json';
function collectFiles(string $root_path = __DIR__): array
{
    $result = [];
    $current_list = scandir($root_path);
    $thisFile = basename(__FILE__);
    $current_list = array_filter($current_list, fn($item) => !str_starts_with($item, '.'));
    $current_list = array_diff($current_list, [
        'node_modules',
        'cnf',
        $thisFile,
        str_replace('.php', '.json', $thisFile)
    ]);
    $current_list = array_map(fn(string $item) => $root_path . DIRECTORY_SEPARATOR . $item, $current_list);

    foreach ($current_list as $path) {
        if (file_exists($path) && is_dir($path)) {
            $result = array_merge($result, collectFiles($path));
        } elseif (file_exists($path) && is_file($path) && (__FILE__ !== $path)) {
            $result[$path] = file_get_contents($path);
            echo "File $path data was collected." . PHP_EOL;
        }
    }


    return $result;
}

function findLinesWithNeededText(string $content): array
{
    $matches = [];
    preg_match_all('([\w-]*paydock[\w-]*)ui', $content, $matches);
//    preg_match_all('(\S*paydock\S*)ui', $content, $matches);

    return array_map('trim', $matches[0]);
}

function collectStubs(): void
{
    $files = collectFiles();
    $result = [];
    foreach ($files as $file => $content) {
        $result = array_merge($result, findLinesWithNeededText($content));
        echo "Slug from file $file was collected." . PHP_EOL;
    }

    file_put_contents(RESULT_FILE_PATH, json_encode(array_flip($result)));
}

function uniqueStubs()
{
    $data = file_get_contents(RESULT_FILE_PATH);
    $data = json_decode($data, true);
    $data = array_flip($data);
    $data = array_unique($data);
    usort($data, fn($a, $b) => strlen($b) <=> strlen($a));
    $data = array_combine($data,$data);
    file_put_contents(RESULT_FILE_PATH, json_encode($data));
}

function replaceStubs()
{
    $files = collectFiles();
    $stubs = json_decode(file_get_contents(RESULT_FILE_PATH), true);

    foreach ($files as $file => $content) {
        if (str_contains($file, 'paydock')) {
            unlink($file);
            $file = str_replace('paydock', 'powerboard', $file);
        }

        file_put_contents($file, str_replace(array_keys($stubs), array_values($stubs), $content));
        echo "File $file was processed." . PHP_EOL;
    }
}

//collectStubs();
//uniqueStubs();
replaceStubs();
//
//$data = json_decode(file_get_contents(__DIR__ . DIRECTORY_SEPARATOR . 'test.json'));
//$err = json_last_error_msg();
//$result = [];
//foreach ($data as $key => $value) {
//    $result[$value->id] = $value->defaultMessage;
//}
//$a = json_encode($result);
//$a = 1;