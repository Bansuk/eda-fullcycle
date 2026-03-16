import { Kafka } from "kafkajs";
import { upsertBalances } from "./database";

interface BalanceUpdatedPayload {
	account_id_from: string;
	account_id_to: string;
	balance_account_id_from: number;
	balance_account_id_to: number;
}

interface KafkaEvent {
	Name: string;
	Payload: BalanceUpdatedPayload;
}

export async function startConsumer(): Promise<void> {
	const brokers = (process.env.KAFKA_BROKERS || "kafka:29092").split(",");

	const kafka = new Kafka({
		clientId: "balances-service",
		brokers,
		retry: {
			initialRetryTime: 3000,
			retries: 15,
		},
	});

	const consumer = kafka.consumer({ groupId: "balances" });

	await consumer.connect();
	console.log("Kafka consumer connected");

	await consumer.subscribe({ topic: "balances", fromBeginning: true });
	console.log("Subscribed to topic: balances");

	await consumer.run({
		eachMessage: async ({ message }) => {
			if (!message.value) return;

			try {
				const event = JSON.parse(message.value.toString()) as KafkaEvent;
				console.log(`Received event: ${event.Name}`);

				if (event.Name === "BalanceUpdated" && event.Payload) {
					const {
						account_id_from,
						account_id_to,
						balance_account_id_from,
						balance_account_id_to,
					} = event.Payload;

					await upsertBalances([
						{ accountId: account_id_from, balance: balance_account_id_from },
						{ accountId: account_id_to, balance: balance_account_id_to },
					]);

					console.log(
						`Balances updated — from: ${account_id_from}=${balance_account_id_from}, to: ${account_id_to}=${balance_account_id_to}`,
					);
				}
			} catch (err) {
				console.error("Error processing Kafka message:", err);
			}
		},
	});
}
