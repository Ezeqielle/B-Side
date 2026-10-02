<?php

declare(strict_types=1);

use Rector\Config\RectorConfig;

return RectorConfig::configure()
    ->withPaths([
        __DIR__ . '/config',
        __DIR__ . '/src',
        __DIR__ . '/tests',
    ])
    ->withSkipPath(__DIR__ . '/config/bundles.php')
    ->withSkipPath(__DIR__ . '/config/reference.php')
    // Géré par la recipe phpunit/phpunit : éviter les diffs à chaque recipe:update
    ->withSkipPath(__DIR__ . '/tests/bootstrap.php')
    ->withPhpSets()
    ->withPreparedSets(symfonyCodeQuality: true)
    ->withComposerBased(doctrine: true, phpunit: true, symfony: true)
    ->withAttributesSets(all: true)
    ->withTypeCoverageLevel(0)
    ->withDeadCodeLevel(0)
    ->withImportNames(importShortClasses: false, removeUnusedImports: true)
    ->withCodeQualityLevel(0);
