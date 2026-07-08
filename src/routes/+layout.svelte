<script>
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Task Burndown</title>
</svelte:head>

<div class="min-h-screen bg-[var(--color-void)] text-white antialiased">
	{@render children()}
</div>
