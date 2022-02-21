<?php declare(strict_types = 1);

namespace Pd\Forms\ContentSecurityPolicy;

interface ContentSecurityPolicyInterface
{

	public function getNonce(): ?string;

}
