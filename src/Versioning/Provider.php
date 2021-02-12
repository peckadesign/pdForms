<?php declare(strict_types = 1);

namespace Pd\Forms\Versioning;

interface Provider
{
	public function generatePathWithVersion(string $filePath): string;
}
