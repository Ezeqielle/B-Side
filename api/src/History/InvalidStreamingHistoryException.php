<?php

namespace App\History;

use Symfony\Component\HttpKernel\Attribute\WithHttpStatus;

#[WithHttpStatus(422)]
final class InvalidStreamingHistoryException extends \RuntimeException
{
}
