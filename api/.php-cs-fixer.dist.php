<?php

$finder = (new PhpCsFixer\Finder())
    ->in(__DIR__ . '/src')
    ->in(__DIR__ . '/tests')
;

return (new PhpCsFixer\Config())
    ->setRules([
        '@PHP8x5Migration' => true,
        '@PHP8x5Migration:risky' => true,
        '@Symfony' => true,
        '@Symfony:risky' => true,
        'concat_space' => ['spacing' => 'one'],
        'increment_style' => ['style' => 'post'],
        'no_alias_functions' => true,
        'no_useless_else' => true,
        'no_useless_return' => true,
        'protected_to_private' => false,
        'type_declaration_spaces' => false,
    ])
    ->setRiskyAllowed(true)
    ->setFinder($finder)
;
