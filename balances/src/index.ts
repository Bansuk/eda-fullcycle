import { startConsumer } from "./consumer";
import { startServer } from "./server";

const PORT = Number(process.env.PORT) || 3003;
const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 5000;

async function waitAndStartConsumer(): Promise<void> {
	let retries = MAX_RETRIES;

	while (retries > 0) {
		try {
			await startConsumer();
			return;
		} catch (err) {
			retries--;
			console.error(
				`Kafka consumer failed to start. Retries left: ${retries}`,
				err,
			);

			if (retries === 0) {
				console.error("Max retries reached. Exiting process.");
				process.exit(1);
			}

			console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
		}
	}
}

async function main(): Promise<void> {
	console.log("Starting Balances Service...");

	// Start HTTP server immediately
	startServer(PORT);

	// Start Kafka consumer with retry logic
	await waitAndStartConsumer();
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
