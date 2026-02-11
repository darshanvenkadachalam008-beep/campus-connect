export default async () => {
  return new Response(
    JSON.stringify({ message: "Edge function working" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
};
